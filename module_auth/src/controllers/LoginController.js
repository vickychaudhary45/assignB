const initializeConnections = require("../../../config/db");
const { BadRequest, Unauthorized } = require("../utils/errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const md5 = require("md5");
const axios = require("axios");
require("dotenv").config();

const saltRounds = 10;
const tblUser = "users";

// currently not used
exports.logout = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { userData } = req.body;
    console.log(userData, "userData");

    const current_date_time = new Date();
    const user_id = userData.userId;

    await KnexB2BLms(tblUser)
      .where({ id: user_id })
      .update({ logout_at: current_date_time });

    return res.status(200).json({
      status: "success",
      msg: "Logout Successful",
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { KnexB2BLms, ApplicationSecret } = await initializeConnections();
    const { email, password } = req.body;
    if (!email || !password) {
      throw new BadRequest("Required data is missing");
    }

    const user = await KnexB2BLms(tblUser)
      .select(
        "id",
        "email",
        "password",
        "username",
        "firstname",
        "lastname",
        "profile_picture",
        "deleted_at",
        "login_count",
        "app_ver",
        "is_owner",
        "company_id"
      )
      .where("email", "iLike", email)
      .first();
    // console.log(user, "user");

    if (user && user.deleted_at !== null) {
      return res.json({
        status: false,
        message: `Account deactivated. Contact your company Administrator`,
      });
    }

    if (!user) {
      throw new Unauthorized("User not found");
    } else {
      const companyStatus = await KnexB2BLms("corp_company")
        .select("id", "trail_period", "is_trail")
        .where("id", user.company_id)
        .where("status", 1)
        .first();
      console.log(user.company_id, "user.company_id");
      console.log(companyStatus, "companyStatus");

      if (!companyStatus) {
        res.json({
          status: false,
          message: `Company Account deactivated. Contact support team.`,
        });
        return;
      } else {
        if (companyStatus.is_trail) {
          let date = new Date(Date.parse(companyStatus.trail_period));
          let dateTwo =
            (date.getDate() > 9 ? date.getDate() : "0" + date.getDate()) +
            "/" +
            (date.getMonth() > 8
              ? date.getMonth() + 1
              : "0" + (date.getMonth() + 1)) +
            "/" +
            date.getFullYear();
          date = new Date(); //Year, Month, Date
          let dateOne =
            (date.getDate() > 9 ? date.getDate() : "0" + date.getDate()) +
            "/" +
            (date.getMonth() > 8
              ? date.getMonth() + 1
              : "0" + (date.getMonth() + 1)) +
            "/" +
            date.getFullYear();
          if (dateOne > dateTwo) {
            await KnexB2BLms("corp_company")
              .update({ status: 0 })
              .where({ id: companyStatus.id });
            res.json({
              status: false,
              message: `Company Account deactivated. Contact support team.`,
            });
            return;
          }
        }
      }
    }

    const passMatch = await bcrypt.compare(password, user.password);

    if (!passMatch) {
      const checked = md5(password) === user.password;
      if (!checked) {
        throw new Unauthorized("The username or password is incorrect");
      } else {
        const encPass = await bcrypt.hashSync(password.trim(), saltRounds);
        await KnexB2BLms("users").update({ password: encPass }).where({
          id: user.id,
        });
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        user_email: user.email,
        user_name: user.username,
        company_id: user?.company_id,
      },
      ApplicationSecret.secret.JWT_SECRET,
      {
        expiresIn: "1y",
        issuer: ApplicationSecret.secret.JWT_ISSUER,
        audience: "AmayaInnovex User",
        subject: `${user.email}`,
      }
    );

    await this.storeLoginDetails(user);

    const company = await KnexB2BLms("corp_company")
      .select(
        "abletodownload_orderreport",
        "limitedusers",
        "howmanyusers",
        "bulkuploaddisallow",
        "company_name",
        "favicon",
        "allow_whitelabeling",
        "enable_custom_login",
        "login_page_slug"
      )
      .where({ id: user.company_id })
      .first();

    const permissions_array = await KnexB2BLms("corp_role_user")
      .where({ user_id: user.id })
      .leftJoin("corp_roles", "corp_roles.id", "corp_role_user.role_id")
      .select("corp_roles.name as role_name", "corp_roles.permission");

    const p_array = permissions_array.flatMap((item) =>
      JSON.parse(item.permission)
    );

    let corp_role_capabilities = [
      5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 18, 199, 200, 201, 202, 203, 204,
      205, 206, 207, 208, 209, 210, 211,
    ];
    const portal_switch =
      p_array.some((item) => corp_role_capabilities.includes(item)) || false;

    return res.status(200).json({
      status: true,
      msg: "Login successful",
      data: {
        token,
        user_id: user.id,
        user_email: user.email,
        name: {
          first: user.firstname,
          last: user.lastname,
        },
        profile_img: user.profile_picture,
        is_owner: user.is_owner,
        company_id: user.company_id,
        abletodownload_orderreport: company.abletodownload_orderreport,
        allow_whitelabeling: company.allow_whitelabeling,
        company_name: company.company_name,
        favicon: company.favicon,
        portal_switch: portal_switch,
        has_custom_login: company.enable_custom_login,
        login_page_slug: company.login_page_slug,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Used Inside login funtion
exports.storeLoginDetails = async (user) => {
  const { KnexB2BLms } = await initializeConnections();
  const current_date_time = new Date();
  const user_id = user.id;
  const login_count = user.login_count;

  await KnexB2BLms(tblUser)
    .where({ id: user_id })
    .update({
      login_count: login_count + 1,
      login_at: current_date_time,
    });

  return true;
};
