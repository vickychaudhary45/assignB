const bcrypt = require("bcryptjs");
const { BadRequest, NotFound } = require("../utils/errors");
const initializeConnections = require("../../../config/db");
const mailHelper = require("../../../config/mail");
const { makeToken } = require("../../../module_auth/src/utils/helper");
const EnrollmentHelper = require("../../../helpers/EnrollmentHelper");
require("dotenv").config();

const acendingOrder = (data) => {
  return data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
};

const pref = {
  notification_settings: {
    courses_and_labs_newsletter_and_updates: true,
    discount_and_special_offers: true,
    course_reminder: true,
    updated_the_course_and_labs: true,
    add_new_courses_and_labs: true,
    subscription_expired: true,
  },
  looking_for_job_change: true,
  profile_share: true,
  user_certificates: [],
  dark_mode: false,
};

const getSubscription = async (userId) => {
  const { KnexB2BLms } = await initializeConnections();
  const enrolledSubscriptions = await KnexB2BLms(
    "subscription_enrollments as se"
  )
    .leftJoin(
      "corp_subscriptions as cs",
      "cs.lms_subscription_id",
      "se.plan_id"
    )
    .select("cs.name", "se.plan_id", "se.created_at", "se.start_date")
    .orderBy("se.created_at", "desc")
    .where({ user_id: userId });

  const sortedSubscription = acendingOrder(enrolledSubscriptions);
  return !!enrolledSubscriptions ? sortedSubscription : [];
};

exports.getUsers = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const {
      page = 0,
      per_page = 10,
      sortDate = "desc",
      sortingColumn = "created_at",
      company_id,
      search = null,
      startDate,
      endDate,
    } = req.body;
    if (!company_id) {
      throw new BadRequest("Company Id is missing.");
    }
    const UserDeleteAction = await KnexB2BLms("corp_company")
      .select("allow_delete_user")
      .where("id", company_id)
      .first();

    const users = await KnexB2BLms("users")
      .select(
        "id",
        "firstname",
        "company_id",
        "lastname",
        "login_at as last_login",
        "deleted_at",
        "email",
        "created_at",
        "is_owner"
      )
      .where("company_id", company_id)
      .where(function () {
        if (search) {
          this.where("firstname", "iLIKE", "%" + search.trim() + "%")
            .orWhere("lastname", "iLIKE", "%" + search.trim() + "%")
            .orWhere("email", "iLIKE", "%" + search.trim() + "%");
        }
        if (UserDeleteAction.allow_delete_user === 0) {
          this.whereNull("deleted_at");
        }
        if (startDate && endDate) {
          this.whereRaw(
            `created_at::date BETWEEN 
            '${new Date(startDate).toISOString().split("T")[0]}'
            AND '${new Date(endDate).toISOString().split("T")[0]}'`
          );
        }
      })
      .whereNot(
        KnexB2BLms.raw("CURRENT_TIMESTAMP - deleted_at > INTERVAL '90 days'")
      )
      .orWhere("deleted_at", null)
      .where("company_id", company_id)
      .where(function () {
        if (search) {
          this.where("firstname", "iLIKE", "%" + search.trim() + "%")
            .orWhere("lastname", "iLIKE", "%" + search.trim() + "%")
            .orWhere("email", "iLIKE", "%" + search.trim() + "%");
        }
        if (UserDeleteAction.allow_delete_user === 0) {
          this.whereNull("deleted_at");
        }
        if (startDate && endDate) {
          this.whereRaw(
            `created_at::date BETWEEN 
            '${new Date(startDate).toISOString().split("T")[0]}'
            AND '${new Date(endDate).toISOString().split("T")[0]}'`
          );
        }
      })
      .orderBy(sortingColumn, sortDate);

    for (const user of users) {
      const corpRolesUser = await KnexB2BLms("corp_role_user as cru")
        .leftJoin("corp_roles as cr", "cr.id", "cru.role_id")
        .select("cr.name as role_names")
        .where("cru.user_id", user.id);
      let allRoleNames = corpRolesUser
        .map((item) => {
          return item.role_names;
        })
        .join(", ");
      if (allRoleNames) {
        user.user_roles = allRoleNames;
      } else {
        user.user_roles = "Employee";
      }
    }

    return res.status(200).json({
      status: "success",
      message: users ? "Users List" : "No Users found for this Company.",
      data: users,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getPrivileges = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const user_id = req.userData?.userId;
    let permissions = [];
    let owner = 0,
      employee = 0,
      feedback_form_on = false;
    let privileges = [];
    let privilegesRoutes = [];
    // if (!user_id) {
    //   throw new BadRequest('User Id is missing.');
    // }
    // const user_plan_ids = await KnexB2BLms('subscription_enrollments')
    //   .where({ user_id, is_plan_active: '1' })
    //   .andWhere('end_date', '>=', new Date())
    //   .pluck('plan_id');

    // const user_plans = await KnexB2BLms('corp_subscriptions')
    //   .select('id')
    //   .where('status', 1)
    //   .where('is_sitewide', 1)
    //   .whereIn('lms_subscription_id', user_plan_ids);

    // const userData = await KnexB2BLms('users')
    //   .whereNull('deleted_at')
    //   .where('id', user_id)
    //   .select('is_owner', 'company_id')
    //   .first();
    // owner = userData?.is_owner;

    // if (owner) {
    //   // only trigger feedback form if owner is 1.
    //   let company_id = userData?.company_id;
    //   if (!company_id) {
    //     // if company_id is not there; highly unlikely, make a query to Users table with this user_id
    //     company_id = await KnexB2BLms(tblUsers)
    //       .where(`${tblUsers}.id`, user_id)
    //       .select('company_id')
    //       .first()

    //     // check this company_id in client_feedbacks table
    //   }

    //   const feedback_forms = await KnexB2BLms('client_user_feedbacks as cuf')
    //     .where('cuf.company_id', company_id)
    //     .andWhere('cuf.status', '=', false)
    //     .select('*');

    //   if (feedback_forms.length > 0) {
    //     feedback_form_on = true;
    //   }
    // }

    // if (!userData) {
    //   throw new NotFound('User Id is not found');
    // }

    // if (!userData?.is_owner) {
    //   employee = 1;
    //   const data = await KnexB2BLms('corp_roles')
    //     .where(`corp_role_user.user_id`, user_id)
    //     .leftJoin('corp_role_user', 'corp_roles.id', 'corp_role_user.role_id')
    //     .select('corp_roles.permission');

    //   if (!data) {
    //     throw new BadRequest('No roles found for this user id!');
    //   }

    //   data.forEach((element) => {
    //     let permission = JSON.parse(element.permission);
    //     permissions = permissions.concat(permission);
    //   });
    //   const userPermissions = Array.from(new Set(permissions));
    //   privileges = await KnexB2BLms('corp_role_capabilities')
    //     .whereIn('id', userPermissions)
    //     .select('name')
    //     .pluck('name');
    // let privilegesR = await KnexB2BLms('corp_role_capabilities')
    //     .whereNotIn('id', userPermissions)
    //     .pluck('capability_slug');
    //   privilegesRoutes = privilegesR
    //     .filter(route => route.startsWith('/'))
    //     .map(route => route.startsWith('/reports/') ? route.replace('/reports', '') : route);
    // }
    // const [{ count: totalUser }] = await KnexB2BLms('users')
    //   .where({ company_id: userData?.company_id })
    //   .count();
    // const company = await KnexB2BLms('corp_company')
    //   .select('abletodownload_orderreport', 'howmanyusers', 'bulkuploaddisallow', 'allow_live_lab_report', 'allow_delete_user',
    //     'enable_license_feature', 'allow_cobranding', 'cobranding_text', 'profile_pic', 'allow_whitelabeling', 'trail_period', 'is_trail',
    //     'default_role', 'favicon', 'company_name', 'enable_workspaces', 'enable_lab_validation', 'enable_vm', 'limitedusers','enable_custom_sandbox',
    //     'subscription_license', 'pt_license', 'oc_license', 'lab_license', 'sandbox_license',
    //     'utilised_subscription_license', 'utilised_pt_license', 'utilised_oc_license', 'utilised_lab_license', 'utilised_sandbox_license',
    //     KnexB2BLms.raw('SUM(subscription_license + pt_license + oc_license + lab_license + sandbox_license) as purchased_license'),
    //     KnexB2BLms.raw('SUM(utilised_subscription_license + utilised_pt_license + utilised_oc_license + utilised_lab_license + utilised_sandbox_license) as assigned_license'),
    //   )
    //   .where({ id: userData?.company_id })
    //   .where('status', 1)
    //   .groupBy('abletodownload_orderreport', 'howmanyusers', 'bulkuploaddisallow', 'allow_live_lab_report', 'allow_delete_user',
    //     'enable_license_feature', 'allow_cobranding', 'cobranding_text', 'profile_pic', 'allow_whitelabeling', 'trail_period', 'is_trail',
    //     'default_role', 'favicon', 'company_name', 'enable_workspaces', 'enable_lab_validation', 'enable_vm', 'limitedusers','enable_custom_sandbox',
    //     'subscription_license', 'pt_license', 'oc_license', 'lab_license', 'sandbox_license',
    //     'utilised_subscription_license', 'utilised_pt_license', 'utilised_oc_license', 'utilised_lab_license', 'utilised_sandbox_license',
    //   )
    //   .first();

    // let final_trail_period = '';
    // if (company.trail_period) {
    //   let date = new Date(Date.parse(company.trail_period));
    //   let d =
    //     (date.getDate() > 9 ? date.getDate() : '0' + date.getDate()) + '/' +
    //     (date.getMonth() > 8 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1)) + '/' +
    //     date.getFullYear();
    //   final_trail_period = d;
    // }
    // let permissions_array = await KnexB2BLms("corp_role_user").where({ user_id })
    //   .leftJoin("corp_roles", "corp_roles.id", "corp_role_user.role_id")
    //   .select("corp_roles.name as role_name", "corp_roles.permission");

    // let p_array = [];
    // permissions_array.forEach(item => {
    //   item.permission = JSON.parse(item.permission);
    //   item.permission.map(it => { return p_array.push(it); });
    // });
    // let corp_role_capabilities = [
    //   5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 18, 199, 200, 201, 202, 203, 204,
    //   205, 206, 207, 208, 209, 210, 211,
    // ];
    // const portal_switch = p_array.some(item => corp_role_capabilities.includes(item)) || false;

    // const userRequestCoursesCount = await KnexB2BLms('corp_user_request_courses')
    //   .where({ company_id: userData?.company_id })
    //   .count();
    // const totalUserRequestCourses = userRequestCoursesCount[0]?.count || 0;

    return res.status(200).json({
      status: "success",
      message: "Privileges List",
      data: {
        abletodownload_orderreport: 0,
        howmanyusers: null,
        bulkuploaddisallow: 0,
        allow_live_lab_report: 0,
        allow_delete_user: 0,
        enable_license_feature: 0,
        allow_cobranding: 0,
        cobranding_text: "",
        profile_pic: "",
        allow_whitelabeling: 0,
        trail_period: "",
        is_trail: 0,
        default_role: "Admin",
        favicon: "",
        company_name: "vicky_chaudhary",
        enable_workspaces: false,
        enable_lab_validation: false,
        enable_vm: false,
        limitedusers: 0,
        enable_custom_sandbox: false,
        subscription_license: 0,
        pt_license: 0,
        oc_license: 0,
        lab_license: 0,
        sandbox_license: 0,
        utilised_subscription_license: 0,
        utilised_pt_license: 0,
        utilised_oc_license: 0,
        utilised_lab_license: 0,
        utilised_sandbox_license: 0,
        purchased_license: "0",
        assigned_license: "0",
        privileges: [],
        is_owner: 1,
        is_employee: 0,
        is_sitewide: true,
        totalUser: "3",
        unassigned_license: 0,
        portal_switch: false,
        restrict_privileges: [],
        totalUserRequestCourses: "0",
        feedback_form: false,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.add = async (req, res, next) => {
  try {
    const { KnexB2BLms, ApplicationSecret } = await initializeConnections();
    const { company_id, firstname, lastname, email, privileges } = req.body;
    if (!company_id || !firstname || !lastname || !email || !privileges) {
      throw new BadRequest("Kindly fill Required data.");
    }
    const corpInfo = await KnexB2BLms("corp_company")
      .where({ id: company_id })
      .first(
        "allow_whitelabeling",
        "login_page_slug",
        "company_name",
        "enable_custom_login",
        "profile_pic",
        "sender_email"
      );
    const user = await KnexB2BLms("users")
      .where({ email: email.toLowerCase() })
      .first();
    if (user) {
      throw new BadRequest("User email already exists");
    }

    const encPass = await bcrypt.hashSync("Welcome@123".trim(), 10);

    const rememberToken = makeToken(100);

    const resetLink =
      ApplicationSecret.configuration.secret.FRONT_URL +
      `password/reset?token=${rememberToken}&email=${email}`;
    const resetLinkWL =
      ApplicationSecret.configuration.secret.FRONT_URL +
      `password/reset/${corpInfo.login_page_slug}?token=${rememberToken}&email=${email}`;
    const user_data = {
      username: email.toLowerCase(),
      firstname: firstname,
      lastname: lastname,
      email: email.toLowerCase(),
      password: encPass,
      remember_token: rememberToken,
      company_id: company_id,
      created_at: new Date(),
      updated_at: new Date(),
      user_preferences: pref,
    };
    const user_id = await KnexB2BLms("users").insert(user_data).returning("id");

    const role_id = await KnexB2BLms("corp_roles")
      .where({ is_global: 1 }) // is_global = 1 means global role which is employee role
      .select("id")
      .first();

    let mail_data = {
      templateName: "default_template",
      email: email.toLowerCase(),
      emailbody: `<p>Hi ${firstname} ${lastname},</p>
      <p>Welcome to Whizlabs. Your account has been created successfully. Please find your credentials below:</p>
      <p>URL: ${ApplicationSecret.configuration.secret.FRONT_URL} </p>
      <p>Username: ${email.toLowerCase()}</p>

      You can set up your account password by clicking on the link below: <br>
      <a href="${resetLink}">${resetLink}</a>
      <p>Thanks,</p>
      <p>Whizlabs Team</p>`,
      dynamic_template_data: {
        subject: "Welcome to Whizlabs Business",
      },
    };
    let mailData = {
      firstname: firstname,
      lastname: lastname,
      email: email,
      company_name: corpInfo.company_name,
      resetLink: resetLinkWL,
      slug: corpInfo.login_page_slug,
      profile_pic: corpInfo.profile_pic,
      sender_email: corpInfo.sender_email,
    };
    //pass the data object to send the email
    const mailStatus = await Promise.resolve(
      corpInfo.allow_whitelabeling && corpInfo.enable_custom_login
        ? mailHelper.sendUserAddEmailWhiteLabel(mailData)
        : mailHelper.sendUserAddEmail(mail_data)
    );
    if (mailStatus) {
      const userMail = await KnexB2BLms("users")
        .update({ welcome_email_status: true })
        .where({ id: user_id[0] });
    }

    if (!mailStatus) {
      const returnMail = await Promise.resolve(
        corpInfo.allow_whitelabeling && corpInfo.enable_custom_login
          ? mailHelper.sendUserAddEmailWhiteLabel(mailData)
          : mailHelper.sendUserAddEmail(mail_data)
      );
      if (returnMail) {
        const userMail = await KnexB2BLms("users")
          .update({ welcome_email_status: true })
          .where({ id: user_id[0] });
      }
    }
    let role_user_data = {
      user_id: user_id[0],
      role_id: role_id.id,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (privileges.length > 0)
      role_user_data = privileges.map((role) => ({
        user_id: user_id[0],
        role_id: role,
        created_at: new Date(),
        updated_at: new Date(),
      }));
    const result = await KnexB2BLms("corp_role_user")
      .insert(role_user_data)
      .returning("id");

    return res.status(201).json({
      status: "success",
      message: "Users inserted successfully and Details Sent to the users",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

exports.edit = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { user_id, firstname, lastname, privileges } = req.body;
    if (!user_id || !firstname || !lastname || !privileges) {
      throw new BadRequest("Kindly fill Required data.");
    }
    const user = await KnexB2BLms("users").where({ id: user_id }).first();
    if (!user) {
      throw new BadRequest("User not exists");
    }

    const user_data = {
      firstname: firstname,
      lastname: lastname,
      updated_at: new Date(),
    };
    await KnexB2BLms("users").where({ id: user_id }).update(user_data);
    let role_user_data = [];
    await KnexB2BLms("corp_role_user").del().where({
      user_id: user_id,
    });

    if (privileges.length > 0)
      role_user_data = privileges.map((role) => ({
        user_id: user_id,
        role_id: role,
        created_at: new Date(),
        updated_at: new Date(),
      }));
    const result = await KnexB2BLms("corp_role_user")
      .insert(role_user_data)
      .returning("id");

    return res.status(201).json({
      status: "success",
      message: "Users updated successfully",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { user_id, status } = req.body;
    const user = await KnexB2BLms("users").where({ id: user_id }).first();
    if (!user) {
      throw new BadRequest("User not exists");
    }

    const user_data = {
      suspended: status === true ? false : true,
      deleted_at: status === true ? null : new Date(),
    };
    let deleted = await KnexB2BLms("users")
      .where({ id: user_id })
      .update(user_data);

    return res.status(201).json({
      status: "success",
      message: "Users deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { user_id } = req.body;
    if (!user_id) {
      throw new BadRequest("User Id is missing.");
    }
    const user = await KnexB2BLms("users")
      .select("firstname", "lastname", "email")
      .whereNull("deleted_at")
      .where({ id: user_id })
      .first();
    const data = await KnexB2BLms("corp_role_user")
      .where(`user_id`, user_id)
      .select(`role_id`);

    if (!user) {
      throw new BadRequest("User not exists");
    }

    return res.status(200).json({
      status: "success",
      message: "User details",
      data: {
        ...user,
        role: data.length > 0 ? data?.map((role) => role.role_id) : [],
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.quickView = async (req, res, next) => {
  try {
    const { KnexB2BLms, KnexMaster } = await initializeConnections();
    const { user_id } = req.body;
    if (!user_id) {
      throw new BadRequest("User Id is missing.");
    }
    const user = await KnexB2BLms("users").where({ id: user_id }).first();
    const data = await KnexB2BLms("corp_role_user")
      .where(`user_id`, user_id)
      .select(`role_id`);
    if (!user) {
      throw new BadRequest("User not exists");
    }
    const quickViewItems = {};

    let userInfo = {
      profile_picture: user.profile_picture,
      email: user.email,
      name: user.firstname + " " + user.lastname,
      last_login: user.login_at,
      role: data.length > 0 ? data?.map((role) => role.role_id) : [],
      created_at: user.created_at,
      deleted_at: user.deleted_at,
      mail_status: user.welcome_email_status,
    };
    const enrolledCourses = await KnexB2BLms("user_course_enrollments_new")
      .select("course_id", "enrollment_type")
      .where({ user_id: user_id })
      .where("is_active", true);

    for (const enrolledCoursesID of enrolledCourses) {
      let courseName = await KnexMaster("courses")
        .where({ id: enrolledCoursesID.course_id })
        .select("name")
        .first();

      // let enrollment_details = JSON.parse(enrolledCoursesID.enrollment_details);

      enrolledCoursesID.name = courseName.name;
      enrolledCoursesID.product_type = courseName.product_type;
      enrolledCoursesID.enrollment_type = enrolledCoursesID.enrollment_type;
      delete enrolledCoursesID.course_id;
      // delete enrolledCoursesID.enrollment_details;
    }
    const [enrolledSubscriptions, enrolledLearningPath, enrolledTeams] =
      await Promise.all([
        KnexB2BLms("subscription_enrollments as se")
          .leftJoin(
            "corp_subscriptions as cs",
            "cs.lms_subscription_id",
            "se.plan_id"
          )
          .select("cs.name", "se.plan_id")
          .where({ user_id: user_id }),

        KnexB2BLms("corp_learning_path_assigned_user as clpa")
          .leftJoin(
            "corp_learning_path as clp",
            "clp.id",
            "clpa.learning_path_id"
          )
          .select("clpa.learning_path_id", "clp.name")
          .where("clpa.user_id", user_id),

        KnexB2BLms("corp_team_users as ctu")
          .leftJoin("corp_teams as ct", "ct.id", "ctu.team_id")
          .select("ct.team_name", "ctu.team_id")
          .where("ctu.user_id", user_id),
      ]);

    let teamsIds = enrolledTeams.map((item) => item.team_id);

    const enrolledLearningPathTeam = await KnexB2BLms(
      "corp_learning_path_assigned_team as clpa"
    )
      .leftJoin("corp_learning_path as clp", "clp.id", "clpa.learning_path_id")
      .select("clpa.learning_path_id", "clp.name")
      .whereIn("clpa.team_id", teamsIds);

    const getSandBox = await KnexB2BLms("sandbox_enrollment_assist")
      .where("user_id", user_id)
      .andWhere("is_enrolled", true)
      .pluck("sandbox_template_assist_id");

    const enrolledSandBox = await KnexMaster("sandbox_template_assist")
      .select("id", "sandbox_title")
      .whereIn("id", getSandBox);

    let lpdata = enrolledLearningPathTeam.concat(enrolledLearningPath);

    const uniqueLP = lpdata.filter((itm, idx) => {
      return (
        idx ===
        lpdata.findIndex((el) => itm.learning_path_id === el.learning_path_id)
      );
    });
    quickViewItems.userData = userInfo;
    quickViewItems.courseDataCount = enrolledCourses
      ? enrolledCourses.length
      : 0;
    quickViewItems.courseData = enrolledCourses;
    quickViewItems.subscriptionDataCount = enrolledSubscriptions
      ? enrolledSubscriptions.length
      : 0;
    quickViewItems.subscriptionData = enrolledSubscriptions;
    quickViewItems.learningPathDataCount = uniqueLP ? uniqueLP.length : 0;
    quickViewItems.learningPathData = uniqueLP;
    quickViewItems.teamsDataCount = enrolledTeams ? enrolledTeams.length : 0;
    quickViewItems.teamsData = enrolledTeams;
    quickViewItems.enrolledSandBoxCount = enrolledSandBox
      ? enrolledSandBox.length
      : 0;
    quickViewItems.enrolledSandBox = enrolledSandBox;

    return res.status(200).json({
      status: "success",
      data: quickViewItems,
    });
  } catch (error) {
    return next(error);
  }
};
