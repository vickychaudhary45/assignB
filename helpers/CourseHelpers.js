const axios = require("axios");
const jwt = require("jsonwebtoken");
const initializeConnections = require("../config/db");
let PHPUnserialize = require('php-unserialize');

exports.getAttemptsData = async (data = null, additional_data) => {
  const { ApplicationSecret } = await initializeConnections();
  const url = new URL(data.play_link);
  const explore_url = url.search.split("&");

  const task = explore_url[1].split("=");
  const quest = explore_url[2].split("=");
  const task_id = task[1];
  const quest_id = quest[1];
  const user_email = additional_data.email ? additional_data.email : "";
  let server_url = "";

  if (additional_data.host == "whizlabs.com" || additional_data.host == "www.whizlabs.com") {
    server_url = "https://play.whizlabs.com";
  } else {
    server_url = "https://play.whizlabs.org";
  }

  server_url = "https://play.whizlabs.com";

  const play_url = server_url + "/backend/web/index.php?r=api/labattempts/report_jwt";

  const token = jwt.sign(
    { task_id: task_id, quest_id: quest_id, user_email: user_email },
    ApplicationSecret.configuration.secret.JWT_SECRET,
    {
      expiresIn: `1y`,
      issuer: ApplicationSecret.configuration.secret.JWT_ISSUER,
      audience: `Whizlabs User`,
      // subject: `${user.email}`,
    }
  );

  const request = { authToken: token, whiz3: 1 };
  let res;
  try {
    const res = await axios.post(play_url, request);
    return res.data;
  } catch (axiosErr) {
    // console.log(axiosErr, "error");
    return { status: 0 };
  }

}; // need check

exports.user_all_enrolled_courses = async (user_id, plan_id = null) => {
  const coursesUnderSubscription = await this.coursesUnderSubscription(user_id, plan_id);
  let all_enrolled_courses = [];

  if (coursesUnderSubscription) {
    all_enrolled_courses = all_enrolled_courses.concat(coursesUnderSubscription);
  }
  let unique = all_enrolled_courses.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });

  return unique;
};

exports.coursesUnderSubscription = async (user_id, plan_id = null) => {
  const { KnexMaster } = await initializeConnections();
  const permissions = await this.subscriptionActvitiesPermissions(user_id, plan_id);
  let all_enrolled_courses = [];
  let all_courses = [];

  if (permissions.is_category == 1) {
    const categorries_array = permissions.category;

    for (const categorry of categorries_array) {
      let course_ids_arr = await KnexMaster("courses")
        .where("course_page_id", categorry.category_id)
        .pluck("id");

      let pt_cours_ids = {};
      let oc_cours_ids = {};
      if (categorry.is_pt && categorry.is_pt == 1) {
        pt_cours_ids = await KnexMaster("courses")
          .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
          .where({ "cl.activity_id": 1 })
          .whereIn("courses.id", course_ids_arr)
          .where("courses.status", 1)
          .pluck("courses.id");
      }

      if (categorry.is_oc && categorry.is_oc == 1) {
        oc_cours_ids = await KnexMaster("courses")
          .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
          .where({ "cl.activity_id": 2 })
          .whereIn("courses.id", course_ids_arr)
          .where("courses.status", 1)
          .pluck("courses.id");
      }

      let lab_courses = {};
      if (permissions.is_lab == 1) {
        lab_courses = await KnexMaster("courses")
          .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
          .where({ "cl.activity_id": 6 }) //activity is labs
          .whereIn("courses.id", course_ids_arr) //course under cat
          .where("courses.status", 1)
          .pluck("courses.id");
      }

      if (pt_cours_ids.length) {
        all_enrolled_courses = all_enrolled_courses.concat(pt_cours_ids);
      }

      if (oc_cours_ids.length) {
        all_enrolled_courses = all_enrolled_courses.concat(oc_cours_ids);
      }

      if (lab_courses.length) {
        all_enrolled_courses = all_enrolled_courses.concat(lab_courses);
      }
    }
  }

  //Checking site wide access
  if (permissions.site_wide == 1) {
    //user fully subscribed all modules
    if (permissions.is_pt == 1 && permissions.site_wide == 1 && permissions.is_oc == 1) {
      all_courses = await KnexMaster("courses").where("courses.status", 1).pluck("courses.id");
    }
    //checking site wide PT access
    else if (permissions.is_pt == 1 && permissions.site_wide == 1) {
      //get all pt course ids
      all_courses = await KnexMaster("courses")
        .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
        .where({ "cl.activity_id": 1 }) //activity is quiz
        .where("courses.status", 1)
        .pluck("courses.id");
    }

    //checking site wide OC access
    else if (permissions.is_oc == 1 && permissions.site_wide == 1) {
      //get all oc course ids
      all_courses = await KnexMaster("courses")
        .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
        .where({ "cl.activity_id": 2 }) //activity is video
        .where("courses.status", 1)
        .pluck("courses.id");
    }

    //checking site wide labs access
    let lab_courses = [];
    if (permissions.is_lab == 1 && permissions.site_wide == 1) {
      //get all labs course ids
      lab_courses = await KnexMaster("courses")
        .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
        .where({ "cl.activity_id": 6 }) //activity is video
        .where("courses.status", 1)
        .pluck("courses.id");
    }

    if (all_courses) {
      all_enrolled_courses = all_enrolled_courses.concat(all_courses);
    }

    if (lab_courses) {
      all_enrolled_courses = all_enrolled_courses.concat(lab_courses);
    }
  }

  //Checking products based access
  if (permissions.is_product == 1) {
    //all course in subscription
    all_courses = permissions.product;

    if (all_courses.length > 0) {
      all_enrolled_courses = all_enrolled_courses.concat(all_courses);
    }
  }
  let sandbox_data = [];
  if (permissions.is_sandbox === 1) {
    sandbox_data = await KnexMaster("courses")
      .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
      .where({ "cl.activity_id": 7 }) //activity is sandbox
      .where("courses.status", 1)
      .pluck("courses.id");
  }
  if (sandbox_data.length) {
    all_enrolled_courses = all_enrolled_courses.concat(sandbox_data);
  }
  let courses = [];
  if (all_enrolled_courses) {
    for (let value of Object.keys(all_enrolled_courses)) {
      if (!courses.includes(all_enrolled_courses[value])) {
        courses.push(all_enrolled_courses[value]);
      }
    }
  }

  let excludedCourses = await this.excludedSubscriptionProducts(user_id, plan_id);
  let finalCoursesList = courses.filter(value => !excludedCourses.includes(value)); //excluding courses

  return finalCoursesList;
};


exports.excludedSubscriptionProducts = async (user_id, plan_id = null) => {
  const { KnexB2BLms, KnexMaster } = await initializeConnections();
  let excludeCourseList = [];
  if (plan_id) {
    const userPlansDetails = await KnexMaster("subscription_plans")
      .pluck("excluded_courses").where('id', plan_id);
    for (let value of Object.keys(userPlansDetails)) {
      if (userPlansDetails[value]) {
        let singleSubsc = JSON.parse(userPlansDetails[value]);
        excludeCourseList.push(...singleSubsc);
      }
    }
  } else {
    const user_plans = await KnexB2BLms("subscription_enrollments")
      .pluck("plan_id")
      .where({user_id: user_id, is_plan_active: "1"})
      .andWhere('end_date', ">=", new Date());

    if (user_plans.length >= 1) {
      const userPlansDetails = await KnexMaster("subscription_plans")
        .pluck("excluded_courses").whereIn('id', user_plans);
      for (let value of Object.keys(userPlansDetails)) {
        if (userPlansDetails[value]) {
          let singleSubsc = JSON.parse(userPlansDetails[value]);
          excludeCourseList.push(...singleSubsc);
        }
      }
    }
  }

  excludeCourseList = excludeCourseList.map(i => Number(i));
  return excludeCourseList;
};

exports.subscriptionActvitiesPermissions = async (user_id, plan_id = null) => {
  const { KnexB2BLms, KnexMaster } = await initializeConnections();
  const permissions = {
    is_pt: 0,
    is_oc: 0,
    is_lab: 0,
    is_sandbox: 0,
    site_wide: 0,
    is_category: 0,
    category: [],
    is_product: 0,
    product: [],
    end_date: "",
    start_date: "",
  };
  if (plan_id) {
    const user_plan = await KnexB2BLms("subscription_enrollments")
      .where(function () {
        if (plan_id) {
          this.where('plan_id', plan_id);
        }
        this.where({user_id, is_plan_active: "1"})
      })
      .first();
    if (user_plan) {
      user_plan.subscription_plan = await KnexMaster("subscription_plans")
        .where({ id: user_plan.plan_id })
        .first();

      user_plan.subscription_categories = await KnexMaster("subscription_plan_categories").where({plan_id: user_plan.plan_id});

      user_plan.subscription_products = await KnexMaster("subscription_plan_products")
        .where({ plan_id: user_plan.plan_id })
        .pluck("course_id");

      //subscription end date
      permissions.start_date = user_plan.start_date ? user_plan.start_date : "";
      permissions.end_date = user_plan.end_date ? user_plan.end_date : "Unlimted";

      //check lab unlimited access
      if (user_plan.subscription_plan.is_unlimited_access_lab == 1) {
        permissions.is_lab = 1;
      }
      //check sandbox unlimited access
      if (user_plan.subscription_plan.is_sandbox_access == 1) {
        permissions.is_sandbox = 1;
      }

      //check is sitewide access
      if (user_plan.subscription_plan.plan_type == 2) {
        permissions.site_wide = 1;

        //check is online based access
        if (user_plan.subscription_plan.course_type == 1) {
          permissions.is_oc = 1;
        }

        //check is pratice test based access
        if (user_plan.subscription_plan.course_type == 2) {
          permissions.is_pt = 1;
        }

        //check is pratice test and onlin test based access
        if (user_plan.subscription_plan.course_type == 3) {
          permissions.is_pt = 1;
          permissions.is_oc = 1;
        }
      } else if (user_plan.subscription_plan.plan_type == 3) {
        //products based subscription
        permissions.is_product = 1;

        //check is online based access
        if (user_plan.subscription_plan.course_type == 1) {
          permissions.is_oc = 1;
        }

        //check is pratice test based access
        if (user_plan.subscription_plan.course_type == 2) {
          permissions.is_pt = 1;
        }

        //check is pratice test and onlin test based access
        if (user_plan.subscription_plan.course_type == 3) {
          permissions.is_pt = 1;
          permissions.is_oc = 1;
          permissions.is_lab = 1;
        }

        if (user_plan.subscription_products) {
          for (let i = 0; i < user_plan.subscription_products.length; i++) {
            permissions.product.push(user_plan.subscription_products[i]);
          }
        }
      } else {
        //check is category based access
        permissions.is_category = 1;

        //categories asigned to plan
        if (user_plan.subscription_categories && user_plan.subscription_categories.length >= 1) {
          //user_plan.subscription_categories.foreach((plan_category) => {
          for (const plan_category of user_plan.subscription_categories) {
            cat_data = { category_id: plan_category.category_id };

            //check is online based access
            if (plan_category.product_type == 1) {
              cat_data.is_oc = 1;
            }

            //check is pratice test based access
            if (plan_category.product_type == 2) {
              cat_data.is_pt = 1;
            }

            //check is pratice test and onlin test based access
            if (plan_category.product_type == 3) {
              cat_data.is_pt = 1;
              cat_data.is_oc = 1;
            }

            permissions.category.push(cat_data);

            cat_data = null;
          }
          plan_category = null;
        }

        //activity access to category
      }
      user_plan.length === 0;
      // }
    }
  } else {
    const user_plans = await KnexB2BLms("subscription_enrollments").where({
      user_id,
      is_plan_active: "1",
    });
    if (user_plans.length >= 1) {
      for (i = 0; i < user_plans.length; i++) {
        var user_plan = user_plans[i];

        user_plan.subscription_plan = await KnexMaster("subscription_plans")
          .where({ id: user_plan.plan_id })
          .first();
        if (!user_plan.subscription_plan) {
          continue;
        }
        user_plan.subscription_categories = await KnexMaster("subscription_plan_categories").where({
          plan_id: user_plan.plan_id,
        });
        //.first();

        user_plan.subscription_products = await KnexMaster("subscription_plan_products")
          .where({ plan_id: user_plan.plan_id })
          .pluck("course_id");

        //subscription end date

        permissions.start_date = user_plan.start_date ? user_plan.start_date : "";
        permissions.end_date = user_plan.end_date ? user_plan.end_date : "Unlimted";

        //check lab unlimited access
        if (user_plan.subscription_plan.is_unlimited_access_lab == 1) {
          permissions.is_lab = 1;
        }
        //check sandbox unlimited access
        if (user_plan.subscription_plan.is_sandbox_access == 1) {
          permissions.is_sandbox = 1;
        }

        //check is sitewide access
        if (user_plan.subscription_plan.plan_type == 2) {
          permissions.site_wide = 1;

          //check is online based access
          if (user_plan.subscription_plan.course_type == 1) {
            permissions.is_oc = 1;
          }

          //check is pratice test based access
          if (user_plan.subscription_plan.course_type == 2) {
            permissions.is_pt = 1;
          }

          //check is pratice test and onlin test based access
          if (user_plan.subscription_plan.course_type == 3) {
            permissions.is_pt = 1;
            permissions.is_oc = 1;
          }
        } else if (user_plan.subscription_plan.plan_type == 3) {
          //products based subscription

          permissions.is_product = 1;

          //check is online based access
          if (user_plan.subscription_plan.course_type == 1) {
            permissions.is_oc = 1;
          }

          //check is pratice test based access
          if (user_plan.subscription_plan.course_type == 2) {
            permissions.is_pt = 1;
          }

          //check is pratice test and onlin test based access
          if (user_plan.subscription_plan.course_type == 3) {
            permissions.is_pt = 1;
            permissions.is_oc = 1;
            permissions.is_lab = 1;
          }

          if (user_plan.subscription_products) {
            for (let i = 0; i < user_plan.subscription_products.length; i++) {
              permissions.product.push(user_plan.subscription_products[i]);
            }
          }
        } else {
          //check is category based access
          permissions.is_category = 1;

          //categories asigned to plan
          if (user_plan.subscription_categories && user_plan.subscription_categories.length >= 1) {
            //user_plan.subscription_categories.foreach((plan_category) => {
            for (const plan_category of user_plan.subscription_categories) {
              cat_data = { category_id: plan_category.category_id };

              //check is online based access
              if (plan_category.product_type == 1) {
                cat_data.is_oc = 1;
              }

              //check is pratice test based access
              if (plan_category.product_type == 2) {
                cat_data.is_pt = 1;
              }

              //check is pratice test and onlin test based access
              if (plan_category.product_type == 3) {
                cat_data.is_pt = 1;
                cat_data.is_oc = 1;
              }

              permissions.category.push(cat_data);

              cat_data = null;
            }
            plan_category = null;
          }

          //activity access to category
        }
        user_plan.length === 0;
      }
    }
  }

  return permissions;
};

exports.courseVideosReport = async (course_id, user_id = null) => {
  try {
    const { KnexB2BLms, KnexMaster } = await initializeConnections();
    const activityIds = await KnexMaster("course_layouts")
      .select("activity_data_id")
      .where("course_id", "=", course_id)
      .andWhere("activity_id", "=", "2");

    let [{ count: completed_videos_countdetail }] = await KnexB2BLms("user_video_tracking")
      .where(function () {
        if (user_id) {
          this.where('user_id', user_id);
        }
      })
      .where("course_id", "=", course_id)
      .whereNotNull("completed_at").count();
    let completed_videos_count = activityIds.length;
    if (activityIds.length >= completed_videos_countdetail) {
      completed_videos_count = completed_videos_countdetail;
    }

    return {
      total_activities_sum: Number(activityIds.length) || 0,
      completed_activities_sum: Number(completed_videos_count) || 0,
    };
  } catch (e) {
    return false;
  }
}

exports.coursePracticeTestReport = async (course_id, user_id = null) => {
  try {
    const { KnexB2BLms, KnexMaster } = await initializeConnections();
    let quizzattempts = [];
    let marks_sum = 0;
    let total_marks_sum = 0;
    const [{ count: ptCount }] = await KnexMaster("course_layouts")
      .join('quizzes', 'course_layouts.activity_data_id', 'quizzes.id')
      .where({course_id, activity_id: 1})
      .whereRaw('is_custom_test is not true')
      .count();
    // total_marks_sum = ptCount;

    // FETCHING QUESTION COUNT DETAILS
    const quizIds = await KnexMaster("course_layouts").select("activity_data_id")
      .where({course_id, activity_id: 1})
      .whereRaw("course_layouts.is_free is not true");
    const quizIdsArr = [];
    quizIds.forEach((item) => {
      quizIdsArr.push(item.activity_data_id);
    });
    const [{ count: quesCount }] = await KnexMaster("quiz_questions")
      .whereIn("quiz_questions.quiz_id", quizIdsArr)
      .count();

    total_marks_sum = quesCount;
    quizzattempts = await KnexB2BLms("user_quiz_attempts")
      .where(function () {
        if (user_id) {
          this.where('user_id', user_id);
        }
        this.where('course_id', course_id);
      })
      .select("quiz_id", "total_marks", "mark_obtained")
      .distinct('quiz_id');

    marks_sum = quizzattempts.length;

    return { marks_sum, total_marks_sum };
  } catch (error) {
    console.log(error);
    // next(error);
    return { marks_sum: 0, total_marks_sum: 0 };
  }
};

exports.courseLabReport = async (course_id, user_id = null) => {
  try {
    const { KnexMaster } = await initializeConnections();
    // let labs = [];
    let completed_labs = 0;
    const [{ count: total_labs }] = await KnexMaster("course_layouts")
      .innerJoin("handson_labs", "course_layouts.activity_data_id", "handson_labs.id")
      .where({course_id, activity_id: 6, section_id: 7, active: 1})
      .count();
    return { completed_labs, total_labs };
  } catch (error) {
    // next(error);
    return { completed_labs: 0, total_labs: 0 };
  }
};

exports.courseSandboxReport = async (course_id, user_id = null) => {
  try {
    const { KnexMaster } = await initializeConnections();
    let completed_sandbox = 0;
    const [{ count: total_sandbox }] = await KnexMaster("course_layouts")
      .where({course_id, activity_id: 7})
      .count();
    return { completed_sandbox, total_sandbox };
  } catch (error) {
    // next(error);
    return { completed_sandbox: 0, total_sandbox: 0 };
  }
};

exports.subscriptionCourses = async (params) => {
  const subscriptionCourseIds = await this.subscriptionCourseIds(params);
  let all_courses_ids = [];

  if (subscriptionCourseIds) {
    all_courses_ids = all_courses_ids.concat(subscriptionCourseIds);
  }
  //remove duplicate course id from list
  let unique = all_courses_ids.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });
  return unique;
};

exports.subscriptionCourseIds = async (params) => {
  const { KnexMaster } = await initializeConnections();
  let all_enrolled_courses = [];
  let all_courses = [];
  const permissions = await this.subscriptionPermissions(params);
  //Checking category based access
  if (permissions.is_category == 1) {
    //all categories in subscription
    const categorries_array = permissions.category;

    for (const categorry of categorries_array) {
      //checking course in category
      let course_ids_arr = await KnexMaster("courses")
        .where("course_page_id", categorry.category_id)
        .pluck("id");

      let pt_cours_ids = {};
      let oc_cours_ids = {};
      //check permissions assigned to category is PT
      if (categorry.is_pt && categorry.is_pt == 1) {
        //check course layout if it have pt in course the add to
        //user enrolled course
        pt_cours_ids = await KnexMaster("courses")
          .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
          .where({ "cl.activity_id": 1 }) //activity is quiz
          .whereIn("courses.id", course_ids_arr) //course under cat
          .where("courses.status", 1)
          .pluck("courses.id");
      }
      //check permissions assigned to category is OC
      if (categorry.is_oc && categorry.is_oc == 1) {
        //check course layout if it have OC in course the add to
        //user enrolled course

        oc_cours_ids = await KnexMaster("courses")
          .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
          .where({ "cl.activity_id": 2 }) //activity is video
          .whereIn("courses.id", course_ids_arr) //course under cat
          .where("courses.status", 1)
          .pluck("courses.id");
      }

      //check labs if all course access not given to users
      let lab_courses = {};
      if (permissions.is_lab == 1) {
        lab_courses = await KnexMaster("courses")
          .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
          .where({ "cl.activity_id": 6 }) //activity is labs
          .whereIn("courses.id", course_ids_arr) //course under cat
          .where("courses.status", 1)
          .pluck("courses.id");
      }

      if (pt_cours_ids.length) {
        all_enrolled_courses = all_enrolled_courses.concat(pt_cours_ids);
      }

      if (oc_cours_ids.length) {
        all_enrolled_courses = all_enrolled_courses.concat(oc_cours_ids);
      }

      if (lab_courses.length) {
        all_enrolled_courses = all_enrolled_courses.concat(lab_courses);
      }
    }
  }

  //Checking site wide access
  if (permissions.site_wide == 1) {
    //user fully subscribed all modules
    if (permissions.is_pt == 1 && permissions.site_wide == 1 && permissions.is_oc == 1) {
      all_courses = await KnexMaster("courses").where("courses.status", 1).pluck("courses.id");
    }
    //checking site wide PT access
    else if (permissions.is_pt == 1 && permissions.site_wide == 1) {
      //get all pt course ids
      all_courses = await KnexMaster("courses")
        .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
        .where({ "cl.activity_id": 1 }) //activity is quiz
        .where("courses.status", 1)
        .pluck("courses.id");
    }

    //checking site wide OC access
    else if (permissions.is_oc == 1 && permissions.site_wide == 1) {
      //get all oc course ids
      all_courses = await KnexMaster("courses")
        .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
        .where({ "cl.activity_id": 2 }) //activity is video
        .where("courses.status", 1)
        .pluck("courses.id");
    }

    //checking site wide labs access
    let lab_courses = [];
    if (permissions.is_lab == 1 && permissions.site_wide == 1) {
      //get all labs course ids
      lab_courses = await KnexMaster("courses")
        .innerJoin("course_layouts as cl", "cl.course_id", "courses.id")
        .where({ "cl.activity_id": 6 }) //activity is video
        .where("courses.status", 1)
        .pluck("courses.id");
    }

    if (all_courses) {
      all_enrolled_courses = all_enrolled_courses.concat(all_courses);
    }

    if (lab_courses) {
      all_enrolled_courses = all_enrolled_courses.concat(lab_courses);
    }
  }

  //Checking products based access
  if (permissions.is_product == 1) {
    //all course in subscription
    all_courses = permissions.product;

    if (all_courses.length > 0) {
      all_enrolled_courses = all_enrolled_courses.concat(all_courses);
    }
  }
  let courses = [];
  if (all_enrolled_courses) {
    for (var value of Object.keys(all_enrolled_courses)) {
      if (!courses.includes(all_enrolled_courses[value])) {
        courses.push(all_enrolled_courses[value]);
      }
    }
  }

  let excludedCourses = await this.excludedSubscriptionCourseIds(params);
  let finalCoursesList = courses.filter(value => !excludedCourses.includes(value)); //excluding courses

  let additionalCourses = await this.additionalSubscriptionCourseIds(params);
  finalCoursesList = finalCoursesList.concat(additionalCourses);

  return finalCoursesList;
};

exports.subscriptionPermissions = async (params) => {
  const { KnexMaster } = await initializeConnections();
  const { plan_ids } = params;
  const permissions = {
    is_pt: 0,
    is_oc: 0,
    is_lab: 0,
    site_wide: 0,
    is_category: 0,
    category: [],
    is_product: 0,
    product: [],
    end_date: "",
    start_date: "",
  };
  if (plan_ids.length >= 1) {
    for (const plan_id of plan_ids) {
      const subscription_plan = await KnexMaster("subscription_plans")
        .where({ id: plan_id })
        .first();
      if (!subscription_plan) {
        continue;
      }
      const subscription_categories = await KnexMaster("subscription_plan_categories").where({plan_id: plan_id});

      const subscription_products = await KnexMaster("subscription_plan_products")
        .where({ plan_id: plan_id })
        .pluck("course_id");

      //subscription end date

      //check lab unlimited access
      if (subscription_plan.is_unlimited_access_lab == 1) {
        permissions.is_lab = 1;
      }
      //check is sitewide access
      if (subscription_plan.plan_type == 2) {
        permissions.site_wide = 1;

        //check is online based access
        if (subscription_plan.course_type == 1) {
          permissions.is_oc = 1;
        }

        //check is pratice test based access
        if (subscription_plan.course_type == 2) {
          permissions.is_pt = 1;
        }

        //check is pratice test and onlin test based access
        if (subscription_plan.course_type == 3) {
          permissions.is_pt = 1;
          permissions.is_oc = 1;
        }
      } else if (subscription_plan.plan_type == 3) {
        //products based subscription
        permissions.is_product = 1;

        //check is online based access
        if (subscription_plan.course_type == 1) {
          permissions.is_oc = 1;
        }

        //check is pratice test based access
        if (subscription_plan.course_type == 2) {
          permissions.is_pt = 1;
        }

        //check is pratice test and onlin test based access
        if (subscription_plan.course_type == 3) {
          permissions.is_pt = 1;
          permissions.is_oc = 1;
          permissions.is_lab = 1;
        }

        if (subscription_products) {
          for (let i = 0; i < subscription_products.length; i++) {
            permissions.product.push(subscription_products[i]);
          }
        }
      } else {
        //check is category based access
        permissions.is_category = 1;

        //categories asigned to plan
        if (subscription_categories && subscription_categories.length >= 1) {
          //subscription_categories.foreach((plan_category) => {
          for (const plan_category of subscription_categories) {

            cat_data = { category_id: plan_category.category_id };

            //check is online based access
            if (plan_category.product_type == 1) {
              cat_data.is_oc = 1;
            }

            //check is pratice test based access
            if (plan_category.product_type == 2) {
              cat_data.is_pt = 1;
            }

            //check is pratice test and onlin test based access
            if (plan_category.product_type == 3) {
              cat_data.is_pt = 1;
              cat_data.is_oc = 1;
            }

            permissions.category.push(cat_data);
            cat_data = null;
          }
          plan_category = null;
        }

        //activity access to category
      }
      plan_ids.length === 0;
    }
  }
  return permissions;
};

exports.excludedSubscriptionCourseIds = async (params) => {
  const { KnexMaster } = await initializeConnections();
  const { plan_ids } = params;
  let excludeCourseList = [];
  if (plan_ids) {
    const plansDetails = await KnexMaster("subscription_plans").pluck("excluded_courses").whereIn('id', plan_ids);
    for (let value of Object.keys(plansDetails)) {
      if (plansDetails[value]) {
        let singleSubsc = JSON.parse(plansDetails[value]);
        excludeCourseList.push(...singleSubsc);
      }
    }
  }
  excludeCourseList = excludeCourseList.map(i => Number(i));
  return excludeCourseList;

};

exports.additionalSubscriptionCourseIds = async (params) => {
  const { KnexB2BLms } = await initializeConnections();
  const { plan_ids } = params;
  let additionalCourseList = [];
  if (plan_ids) {
    const plansDetails = await KnexB2BLms("corp_subscriptions")
      .pluck("additional_courses").whereIn('lms_subscription_id', plan_ids);

    for (let value of Object.keys(plansDetails)) {
      if (plansDetails[value]) {
        let additional_courses = Object.values(PHPUnserialize.unserialize(plansDetails[value]))
        additionalCourseList.push(...additional_courses);
      }
    }
  }

  additionalCourseList = additionalCourseList.map(i => Number(i));
  return additionalCourseList;
};

exports.getTaskSlugSandboxAccess = async course_id => {
  const { KnexMaster } = await initializeConnections();
  let sandbox_id = [];

  if (course_id) {
    const lab_access_id = await KnexMaster("course_layouts").select("course_id", "activity_data_id").where("course_id", course_id).whereIn("activity_id", [7]);

    lab_access_id.forEach(data => {
      if (data) {
        sandbox_id.push(data.activity_data_id);
      }
    });

    if (sandbox_id.length > 0) {
      const labs_task_slug = await KnexMaster("sandboxes").select("id", "sandbox_name", "task_slug", "is_standalone").whereIn("id", sandbox_id).first();

      return labs_task_slug;
    }
  }
  return null;
};
