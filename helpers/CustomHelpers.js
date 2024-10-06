// const geoip = require("geoip-lite");
const initializeConnections = require("../config/db");
const CourseHelper = require("./CourseHelpers");

// need to check
exports.activity_data = async (user_id, activity_type, activity_id, additional_data = null) => {
  const { KnexB2BLms, KnexMaster } = await initializeConnections();
  let response;

  switch (activity_type) {
    case "lab":
      response = await KnexMaster("handson_labs as l")
        //.leftJoin('categories as c', 'c.id', 'l.category_id')
        .select("l.*")
        .where({ "l.id": activity_id })
        .first();

      //lab status
      response = await CourseHelper.getAttemptsData(response, additional_data);
      if (response) {
        Object.assign(response, AttemptsData || {});
        Object.assign(response, { content_type: "Lab" });
      }
      break;

    case "video":
      response = await KnexMaster("videos as v")
        //.leftJoin('categories as c', 'c.id', 'v.category_id')
        //.leftJoin('user_video_tracking as uvt', 'uvt.video_id', 'v.id')
        .select("v.*")
        .where({ "v.id": activity_id })
        .first();

      const video_progress = await KnexB2BLms("user_video_tracking as uvt")
        .select("uvt.status as video_status", "uvt.paused_at")
        .where({ video_id: activity_id, user_id: user_id })
        .first();

      if (response) {
        Object.assign(response, video_progress || {});
        Object.assign(response, { content_type: "video" });
      }

      break;

    case "quiz":
      response = await KnexMaster("quizzes as q")
        .select("q.*")
        .where("q.id", activity_id)
        .first();

      //quiz attempts
      let quiz_attempt = await KnexB2BLms("user_quiz_attempts")
        .where({ quiz_id: activity_id, user_id: user_id })
        .select("quizz_state")
        .first();

      //question count
      let questions = await KnexMaster("quiz_questions")
        .where({ quiz_id: activity_id })
        .count()
        .first();

      if (response) {
        if (questions) {
          Object.assign(response, { question_count: questions.count });
        } else {
          Object.assign(response, { question_count: 0 });
        }

        Object.assign(response, quiz_attempt || {});
        Object.assign(response, { content_type: "quiz" });
      }

      break;

    case "flashcard":
      response = await KnexMaster("flashcards as f")
        //.leftJoin('categories as c', 'c.id', 'v.category_id')
        //.leftJoin('user_video_tracking as uvt', 'uvt.video_id', 'v.id')
        .where({ id: activity_id })
        .first();
      let fcount = 0;
      if (response) {
        const fcount_obj = await KnexMaster("flashcard_questions")
          .count("id as cnt")
          .where({ f_id: response.id })
          .first();
        if (fcount_obj) {
          fcount = fcount_obj.cnt;
        }
      }

      if (response) {
        Object.assign(response, { flashcard_count: fcount });
        Object.assign(response, { content_type: "flashcard" });
      }

      break;
  }

  return response;
};

exports.subscriptionActvitiesPermissions = async (user_id) => {
  const { KnexB2BLms, KnexMaster } = await initializeConnections();
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
    is_sandbox: 0
  };

  const user_plans = await KnexB2BLms("subscription_enrollments").where({
    user_id: user_id,
    is_plan_active: "1",
  });

  if (user_plans.length >= 1) {
    for (const user_plan of user_plans) {
      user_plan.subscription_plan = await KnexMaster("subscription_plans")
        .where({ id: user_plan.plan_id })
        .first();
      if (!user_plan.subscription_plan) {
        continue;
      }
      user_plan.subscription_categories = await KnexMaster("subscription_plan_categories").where({
        plan_id: user_plan.plan_id,
      });

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

      //check lab unlimited access
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

  return permissions;
};

exports.coursesUnderSubscription = async (user_id) => {
  const { KnexMaster } = await initializeConnections();
  const permissions = await this.subscriptionActvitiesPermissions(user_id);

  let all_enrolled_courses = [];
  let all_courses = [];

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
    for (let value of Object.keys(all_enrolled_courses)) {
      if (!courses.includes(all_enrolled_courses[value])) {
        courses.push(all_enrolled_courses[value]);
      }
    }
  }

  return courses;
};

exports.isCourseSubscribed = async (course_id, type, user_id) => {
  const { KnexMaster } = await initializeConnections();
  const permissions = await this.subscriptionActvitiesPermissions(user_id);
  //checking site wide PT access
  if (permissions.is_pt == 1 && type == "PT" && permissions.site_wide == 1) {
    return 1;
  }

  //checking site wide OC access
  if (permissions.is_oc == 1 && type == "OC" && permissions.site_wide == 1) {
    return 1;
  }

  //checking site wide OC access
  if (permissions.is_lab == 1 && type == "LAB" && permissions.site_wide == 1) {
    return 1;
  }

  //checking site wide OC access
  if (permissions.is_sandbox == 1 && type == "SANDBOX" && permissions.site_wide == 1) {
    return 1;
  }

  //Checking category based access
  if (permissions.is_category == 1) {
    //all categories in subscription
    categorries_array = permissions.category;

    if (categorries_array) {
      for (const categorry of categorries_array) {
        //checking course exisit in category or not
        is_exists = await KnexMaster("courses")
          .where({
            course_page_id: categorry.category_id,
            id: course_id,
          })
          .count()
          .first();

        //check permissions assigned to category is PT
        if (is_exists && is_exists.count > 0 && categorry.is_pt == 1 && type == "PT") {
          return 1;
        }
        //check permissions assigned to category is OC
        if (is_exists && is_exists.count > 0 && categorry.is_oc == 1 && type == "OC") {
          return 1;
        }
      }
    }
  }

  //Checking product based access
  if (permissions.is_product == 1) {
    //all cousres in subscription
    courses = permissions.product;

    //check permissions assigned  is PT
    if (course_id in courses && permissions.is_pt == 1 && type == "PT") {
      return 1;
    }
    //check permissions assigned  is OC
    if (course_id in courses && permissions.is_oc == 1 && type == "OC") {
      return 1;
    }
  }

  return false;
};

exports.getActivitiesByUsers = async (lmsUserId, limit, offset) => {

  try {
    const { KnexB2BLms, KnexMaster } = await initializeConnections();
    let selectActivityQuery = await KnexB2BLms("user_quiz_attempts as tb1")
      .leftJoin('users as tb3', 'tb1.user_id', '=', 'tb3.id ')
      .whereIn("tb1.user_id", lmsUserId)
      .where("tb1.result", "!=", "")
      .whereNotNull("tb1.quiz_id")
      .select(
        KnexB2BLms.raw("tb1.updated_at as sortby"),
        KnexB2BLms.raw("tb1.result as result"),
        KnexB2BLms.raw("tb1.attempt_count as attempt_count"),
        KnexB2BLms.raw("tb1.percentage as percentage"),
        KnexB2BLms.raw("tb1.course_id as course_id"),
        KnexB2BLms.raw("tb1.quiz_id as quiz_id"),
        KnexB2BLms.raw("'' as status"),
        KnexB2BLms.raw("0 as video_id"),
        KnexB2BLms.raw("'PT' as type"),
        KnexB2BLms.raw("tb1.user_id as id"),
        KnexB2BLms.raw("tb3.email as email"),
        KnexB2BLms.raw("tb3.firstname as firstname"),
        KnexB2BLms.raw("tb3.lastname as lastname"),
        KnexB2BLms.raw("tb3.profile_picture as profile_picture"),
      ).unionAll(
        KnexB2BLms("user_video_tracking as tb2")
          .leftJoin('users as tb4', 'tb2.user_id', '=', 'tb4.id ')
          .whereIn("tb2.user_id", lmsUserId)
          .whereNotNull("tb2.video_id")
          .select(
            KnexB2BLms.raw("tb2.updated_at as sortby"),
            KnexB2BLms.raw("'' as result"),
            KnexB2BLms.raw("0 as attempt_count"),
            KnexB2BLms.raw("'' as percentage"),
            KnexB2BLms.raw("tb2.course_id as course_id"),
            KnexB2BLms.raw("0 as quiz_id"),
            KnexB2BLms.raw("tb2.status as status"),
            KnexB2BLms.raw("tb2.video_id as video_id"),
            KnexB2BLms.raw("'OC' as type"),
            KnexB2BLms.raw("tb2.user_id as id"),
            KnexB2BLms.raw("tb4.email as email"),
            KnexB2BLms.raw("tb4.firstname as firstname"),
            KnexB2BLms.raw("tb4.lastname as lastname"),
            KnexB2BLms.raw("tb4.profile_picture as profile_picture"),
          )
      )
      .orderBy("sortby", "desc")
      .limit(limit)
      .offset(offset)

    if (selectActivityQuery && selectActivityQuery.length > 0) {
      let selectActivityQueryData = [];
      for (i = 0; i < selectActivityQuery.length; i++) {
        selectActivityQueryData = selectActivityQuery[i];
        let coursename = await KnexMaster("courses")
          .where({ 'id': selectActivityQueryData.course_id })
          .select(KnexMaster.raw("name"),)
          .first();
        selectActivityQueryData.name = selectActivityQueryData.firstname + ' ' + selectActivityQueryData.lastname;
        selectActivityQueryData.txt = coursename.name;
        selectActivityQueryData.img = selectActivityQueryData.profile_picture;
        selectActivityQueryData.date = selectActivityQueryData.sortby;
        if (selectActivityQueryData.type == 'PT') {
          let quizName = await KnexMaster("quizzes")
            .where({ id: selectActivityQueryData.quiz_id })
            .select(KnexMaster.raw("quiz_name"),)
            .first();
          let textString = selectActivityQueryData.result.toLowerCase();
          textString += 'ed ' + quizName.quiz_name;
          textString += ' in attempt no ' + selectActivityQueryData.attempt_count;
          textString += ' with percentage ' + selectActivityQueryData.percentage + '%';
          selectActivityQueryData.text = textString;
          selectActivityQueryData.attempt = "Attempt " + selectActivityQueryData.attempt_count;
          selectActivityQueryData.result = selectActivityQueryData.result;
          if (selectActivityQueryData.result == 'PASS' || selectActivityQueryData.status == 'pass') {
            selectActivityQueryData.status = "passblock";
          } else if (selectActivityQueryData.result == 'FAIL' || selectActivityQueryData.status == 'fail') {
            selectActivityQueryData.status = "failblock";
          } else {
            selectActivityQueryData.status = "Progressblock";
          }
        } else if (selectActivityQueryData.type == 'OC') {
          let videoName = await KnexMaster("videos")
            .where({ id: selectActivityQueryData.video_id })
            .select(KnexMaster.raw("video_name"),)
            .first();
          let textString = videoName.video_name;
          selectActivityQueryData.txt = selectActivityQueryData.txt;
          selectActivityQueryData.attempt = textString;
          selectActivityQueryData.result = selectActivityQueryData.status;
          if (selectActivityQueryData.status == 'Completed' || selectActivityQueryData.status == 'completed') {
            selectActivityQueryData.status = "passblock";
          } else {
            selectActivityQueryData.status = "Progressblock";
          }
        }
        delete selectActivityQueryData.course_id;
        // delete selectActivityQueryData.quiz_id;
        // delete selectActivityQueryData.video_id;
        delete selectActivityQueryData.email;
        delete selectActivityQueryData.attempt_count;
        delete selectActivityQueryData.percentage;
        delete selectActivityQueryData.text;
        delete selectActivityQueryData.sortby;
        delete selectActivityQueryData.firstname;
        delete selectActivityQueryData.lastname;
        delete selectActivityQueryData.profile_picture;
      }
      return {
        data: selectActivityQuery,
      };
    } else {
      return {
        data: []
      };
    }
  } catch (e) {
    console.log(e);
    return false;
  }

}