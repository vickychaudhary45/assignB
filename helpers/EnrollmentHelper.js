const { BadRequest } = require("../module_auth/src/utils/errors");
const initializeConnections = require("../config/db");
const mailHelper = require("../config/mail");
const bcrypt = require("bcryptjs");
const { makeToken } = require("../module_auth/src/utils/helper");

exports.enrollSubscription = async (userId, subscriptionId) => {
  try {
    const { KnexB2BLms, KnexMaster } = await initializeConnections();
    if (!userId || !subscriptionId) {
      throw new BadRequest("user_id or subscriptionId missing");
    }
    if (userId && subscriptionId) {
      const validityOfSubscription = await KnexMaster("subscription_plans")
        .select("subscription_for", "is_unlimited_access_lab", "lab_points").where({ id: subscriptionId }).first();

      const is_sitewide_Subscription = await KnexB2BLms("corp_subscriptions").select('is_sitewide', 'overwrite_expiry', 'expiry_days').where({ lms_subscription_id: subscriptionId }).first();

      const company_id = await KnexB2BLms("users").where({ id: userId }).first();


      let expDateForSubscription = null;
      if (is_sitewide_Subscription?.overwrite_expiry) {
        expDateForSubscription = is_sitewide_Subscription.overwrite_expiry != 0
          ? new Date(new Date().setDate(new Date().getDate() + is_sitewide_Subscription.expiry_days))
          : null;
      } else {
        expDateForSubscription = validityOfSubscription.subscription_for != 0
          ? new Date(new Date().setMonth(new Date().getMonth() + validityOfSubscription.subscription_for))
          : null;
      }

      let subscription_plan_months = validityOfSubscription.subscription_for; // duration of plan


      let is_Already_Subscribed = '';
      if (is_sitewide_Subscription.is_sitewide) {
        is_Already_Subscribed = await KnexB2BLms("subscription_enrollments").leftJoin("corp_subscriptions", "plan_id", "lms_subscription_id").where({ user_id: userId }).where({ is_sitewide: 1 }).andWhere('end_date', ">=", new Date()).first();
      } else {
        is_Already_Subscribed = await KnexB2BLms("subscription_enrollments").where({ user_id: userId }).where({ plan_id: subscriptionId }).andWhere('end_date', ">=", new Date()).first();
      }
      if (is_Already_Subscribed) {
      }
      else {
        const result = await KnexB2BLms("subscription_enrollments").
          insert({
            user_id: userId,
            plan_id: subscriptionId,
            is_plan_active: true,
            type: 'corp',
            start_date: new Date(),
            end_date: expDateForSubscription,
            is_cancelled: 1,
            created_at: new Date(),
            updated_at: new Date(),
            company_id: company_id.company_id,
          }).returning("id");

        if (validityOfSubscription.is_unlimited_access_lab == 1) {
          let isWebOptionsExists = await getWebsiteOptions();
          if (isWebOptionsExists) {
            await creditPointTxn("credit", isWebOptionsExists.value, 0, userId);
          }
        } else {
          if (validityOfSubscription.lab_points) {
            await creditPointTxn("credit", validityOfSubscription.lab_points, 0, userId);
          }
        }
        const getCompanyInfoByUserId = await KnexB2BLms("corp_company as cc")
          .leftJoin("users as u", "u.company_id", "cc.id")
          .where({"u.id": userId})
          .select(
            KnexB2BLms.raw("u.company_id"),
            KnexB2BLms.raw("cc.enable_license_feature"),
            KnexB2BLms.raw("cc.subscription_license"),
            KnexB2BLms.raw("cc.pt_license"),
            KnexB2BLms.raw("cc.oc_license"),
            KnexB2BLms.raw("cc.lab_license"),
            KnexB2BLms.raw("cc.sandbox_license"),
            KnexB2BLms.raw("cc.utilised_subscription_license"),
            KnexB2BLms.raw("cc.utilised_pt_license"),
            KnexB2BLms.raw("cc.utilised_oc_license"),
            KnexB2BLms.raw("cc.utilised_lab_license"),
            KnexB2BLms.raw("cc.utilised_sandbox_license"),
          )
          .first();

        if (getCompanyInfoByUserId.enable_license_feature) {
          await KnexB2BLms("corp_licenses_history").
            insert({
              user_id: userId,
              company_id: getCompanyInfoByUserId.company_id,
              type: "debit",
              license_type: "subscription",
              count: 1,
              created_at: new Date(),
              updated_at: new Date()
            }).returning("id");

          await KnexB2BLms("corp_company").where({ id: getCompanyInfoByUserId.company_id }).update('utilised_subscription_license', (getCompanyInfoByUserId.utilised_subscription_license + 1));
        }
        return result;
      }
    }
  } catch (error) {
    console.log(error);
  }
};

exports.enrollLearningPath = async (userId, learningPathId) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    if (userId && learningPathId) {
      const data = await KnexB2BLms("corp_learning_path_assigned_user").insert({
        user_id: userId,
        learning_path_id: learningPathId,
        created_at: new Date(),
        updated_at: new Date()
      }).returning("learning_path_id");
      return data;
    }
    else {
      throw new BadRequest("user_id and learning_path_id are required.")
    }
  }
  catch (error) {
    console.log(error);
    return error;
  }
}

exports.enrollCourse = async (userId = 3, courseId = 1, CourseType = "FT") => {
  try {
    const { KnexB2BLms, KnexMaster } = await initializeConnections();
    if (!userId || !courseId) {
      throw new BadRequest("user_id or course_id are missing");
    }
    if (userId && courseId) {
      is_Already_Subscribed = await KnexB2BLms("subscription_enrollments").leftJoin("corp_subscriptions", "plan_id", "lms_subscription_id").where({ user_id: userId, is_sitewide: 1 }).andWhere('end_date', ">=", new Date()).first();
      // if user with sitewide then not require to enroll course
      if (is_Already_Subscribed) {
        return true;
      }
      const start_date = new Date();
      const course_id = courseId;
      const course_type = CourseType;
      const user_id = userId;
      let points = 0;
      let course_data = await KnexMaster("courses")
        .where({id: courseId})
        .first("lab_credit_points");

      if (course_type == 'PT') {
        points = course_data?.lab_credit_points?.pt || 0;
      } else if (course_type == 'LAB') {
        points = course_data?.lab_credit_points?.lab || 0;
      } else {
        points = course_data?.lab_credit_points?.oc || 0;
      }
      return await manageLmsEnrollments(course_id, user_id, course_type, start_date, end_date = null, enroll_type = 'automatic', points);
    }
  } catch (error) {
    console.log(error);
  }
}

async function manageLmsEnrollments(course_id, user_id, course_type, start_date,
  end_date = null, enroll_type = 'automatic', points) {
  const { KnexB2BLms } = await initializeConnections();
  // if (course_type === "SANDBOX") {
  //   end_date = new Date(new Date(start_date).setMonth(new Date(start_date).getMonth() + 6));
  // } else {
  //   end_date = new Date(new Date(start_date).setMonth(new Date(start_date).getMonth() + 12));
  // }
 end_date = new Date(
   new Date(start_date).setMonth(new Date(start_date).getMonth() + 12)
 );
  const check_enrolled = await KnexB2BLms("user_course_enrollments_new")
  .where({ course_id, user_id }).where("enrollment_type", course_type).where("is_active", true).first();
  
  const company_id = await KnexB2BLms("users").where({ id: user_id }).first();

  let enrolment_id = null;

  if (!check_enrolled) {
    const insertData = {
      company_id: company_id.company_id,
      enrollment_mode: enroll_type,
      enrollment_type: course_type,
      user_id: user_id,
      course_id: course_id,
      start_date: start_date,
      end_date: end_date
    }

    //enroll user
    const [{ id }] = await KnexB2BLms("user_course_enrollments_new").insert(insertData).returning(["id"]);
    enrolment_id = id;
    if (points) {
      await creditPointTxn("credit", points, course_id, user_id);
    }
    const getCompanyInfoByUserId = await KnexB2BLms("corp_company as cc")
      .leftJoin("users as u", "u.company_id", "cc.id")
      .where({ "u.id": user_id})
      .select([
        "u.company_id",
        "cc.enable_license_feature",
        "cc.subscription_license",
        "cc.pt_license",
        "cc.oc_license",
        "cc.lab_license",
        "cc.sandbox_license",
        "cc.utilised_subscription_license",
        "cc.utilised_pt_license",
        "cc.utilised_oc_license",
        "cc.utilised_lab_license",
        "cc.utilised_sandbox_license"
    ]).first();

    if (getCompanyInfoByUserId.enable_license_feature) {
      await KnexB2BLms("corp_licenses_history").
        insert({
          user_id: user_id,
          company_id: getCompanyInfoByUserId.company_id,
          type: "debit",
          license_type: course_type,
          count: 1,
          created_at: new Date(),
          updated_at: new Date()
        }).returning("id");
      var course_type_name = '';
      var course_type_name_count = 0;
      if (course_type == 'PT') {
        var course_type_name = 'utilised_pt_license';
        course_type_name_count = (getCompanyInfoByUserId.utilised_pt_license + 1);
      } else if (course_type == 'OC') {
        var course_type_name = 'utilised_oc_license';
        course_type_name_count = (getCompanyInfoByUserId.utilised_oc_license + 1);
      } else if (course_type == 'LAB') {
        var course_type_name = 'utilised_lab_license';
        course_type_name_count = (getCompanyInfoByUserId.utilised_lab_license + 1);
      } else if (course_type == 'SANDBOX') {
        var course_type_name = 'utilised_sandbox_license';
        course_type_name_count = (getCompanyInfoByUserId.utilised_sandbox_license + 1);
      }

      await KnexB2BLms("corp_company").where({ id: getCompanyInfoByUserId.company_id }).update(course_type_name, course_type_name_count);
    }
  }
  else {
    // let enrolled_course_activities = check_enrolled.enrollment_type;
    let today = new Date();
    if(today > check_enrolled.end_date) {
      await KnexB2BLms("user_course_enrollments_new").where({ id: check_enrolled.id }).update({
        start_date: start_date,
        end_date: end_date,
      })
    }
    /*
    check if user already enrolled then skip
    otherwise assign insert data to user enrol obj
    */
    enrolment_id = check_enrolled.id;
  }
  return enrolment_id;
}

// credit points function
async function creditPointTxn(txn_type, points, course_id, user_id) {
  const { KnexB2BLms } = await initializeConnections();
  if (txn_type == "credit") {
    await KnexB2BLms("user_lms_credit_points").insert({
      user_id,
      txn_type,
      course_id,
      points,
    });
    return 1;
  }
  else if (txn_type == "withdraw") {
    if (await this.points_balance(user_id) >= points) {
      await KnexB2BLms("user_lms_credit_points").insert({
        txn_type,
        course_id,
        points,
        user_id,
      });
      return 1;
    } else {
      return 0;
    }
  } else if (transaction_type == "refund") { }
}

async function getWebsiteOptions() {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const result = await KnexB2BLms("website_options")
      .where({ key: "lab_points" })
      .select(KnexB2BLms.raw("value"))
      .first();
    return result;
  } catch (e) {
    console.log(e);
    return false;
  }

}

exports.getUserId = async (email, firstname, lastname, company_id) => {
  try {
    const { KnexB2BLms, ApplicationSecret } = await initializeConnections();
    const user = await KnexB2BLms('users').where({ email: email.toLowerCase() }).first();
    const corpInfo = await KnexB2BLms('corp_company').where({id: company_id}).first('allow_whitelabeling', 'login_page_slug', 'company_name', 'enable_custom_login', 'default_role', 'profile_pic', 'sender_email');
    if (user) {
      return user.id;
    } else {
      const role_id = await KnexB2BLms('corp_roles')
        .where({ is_global: 1, name: corpInfo.default_role })
        .select('id')
        .first();

      const encPass = await bcrypt.hashSync(("Welcome@123").trim(), 10);
      const rememberToken = makeToken(100);
      const user_data = {
        username: email,
        firstname: firstname,
        lastname: lastname,
        email: email,
        password: encPass,
        remember_token: rememberToken,
        company_id: company_id,
        user_type: 'corp',
        created_at: new Date(),
        updated_at: new Date(),
      }
      const resetLink = ApplicationSecret.configuration.secret.FRONT_URL + `password/reset?token=${rememberToken}&email=${email}`;
      const resetLinkWL = ApplicationSecret.configuration.secret.FRONT_URL + `password/reset/${corpInfo.login_page_slug}?token=${rememberToken}&email=${email}`;

      const user_id = await KnexB2BLms('users')
        .insert(user_data)
        .returning('id');
      const role_user_data = {
        user_id: user_id[0],
        role_id: role_id.id,
        created_at: new Date(),
        updated_at: new Date()
      };
      await KnexB2BLms('corp_role_user')
        .insert(role_user_data);

      let mail_data = {
        templateName: "default_template",
        email: email.toLowerCase(),
        emailbody: `<p>Hi ${firstname} ${lastname},</p>
              <p>Welcome to Whizlabs. Your account has been created successfully. Please find your credentials below:</p>
              <p>URL: ${ApplicationSecret.configuration.secret.FRONT_URL} <p>
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
        sender_email: corpInfo.sender_email
      }
      // await mailHelper.sendUserAddEmail(mail_data);
      const mailStatus = await Promise.resolve(corpInfo.allow_whitelabeling && corpInfo.enable_custom_login ? 
        mailHelper.sendUserAddEmailWhiteLabel(mailData) : mailHelper.sendUserAddEmail(mail_data));
      if (mailStatus) {
        const userMail = await KnexB2BLms('users')
          .update({ welcome_email_status: true })
          .where({ id: user_id[0] });
      }
      if (!mailStatus) {
        const returnMail = await Promise.resolve(corpInfo.allow_whitelabeling && corpInfo.enable_custom_login ? 
          mailHelper.sendUserAddEmailWhiteLabel(mailData) : mailHelper.sendUserAddEmail(mail_data));
        if (returnMail) {
          const userMail = await KnexB2BLms('users')
            .update({ welcome_email_status: true })
            .where({ id: user_id[0] });
        }
      }
      return user_id[0];
    }
  } catch (error) {
    console.log(error);
  }
}