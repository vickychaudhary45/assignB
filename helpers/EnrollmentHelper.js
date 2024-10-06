const { BadRequest } = require("../module_auth/src/utils/errors");
const initializeConnections = require("../config/db");
const bcrypt = require("bcryptjs");
const { makeToken } = require("../module_auth/src/utils/helper");

exports.getUserId = async (email, firstname, lastname, company_id) => {
  try {
    const { KnexB2BLms, ApplicationSecret } = await initializeConnections();
    const user = await KnexB2BLms("users")
      .where({ email: email.toLowerCase() })
      .first();
    const corpInfo = await KnexB2BLms("corp_company")
      .where({ id: company_id })
      .first(
        "allow_whitelabeling",
        "login_page_slug",
        "company_name",
        "enable_custom_login",
        "default_role",
        "profile_pic",
        "sender_email"
      );
    if (user) {
      return user.id;
    } else {
      const role_id = await KnexB2BLms("corp_roles")
        .where({ is_global: 1, name: corpInfo.default_role })
        .select("id")
        .first();

      const encPass = await bcrypt.hashSync("Welcome@123".trim(), 10);
      const rememberToken = makeToken(100);
      const user_data = {
        username: email,
        firstname: firstname,
        lastname: lastname,
        email: email,
        password: encPass,
        remember_token: rememberToken,
        company_id: company_id,
        user_type: "corp",
        created_at: new Date(),
        updated_at: new Date(),
      };
      const resetLink =
        ApplicationSecret.secret.FRONT_URL +
        `password/reset?token=${rememberToken}&email=${email}`;
      const resetLinkWL =
        ApplicationSecret.secret.FRONT_URL +
        `password/reset/${corpInfo.login_page_slug}?token=${rememberToken}&email=${email}`;

      const user_id = await KnexB2BLms("users")
        .insert(user_data)
        .returning("id");
      const role_user_data = {
        user_id: user_id[0],
        role_id: role_id.id,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await KnexB2BLms("corp_role_user").insert(role_user_data);
      return user_id[0];
    }
  } catch (error) {
    console.log(error);
  }
};
