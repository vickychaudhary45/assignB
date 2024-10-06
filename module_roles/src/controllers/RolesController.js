const { BadRequest } = require("../utils/errors");
const initializeConnections = require("../../../config/db");

exports.capabilities = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const data = await KnexB2BLms("corp_role_capabilities")
      .orderBy("order_by", "asc")
      .select("id", "name", "sub_menu")
      .whereNot("id", 6);
    return res.status(200).json({
      status: "success",
      message: "All Permissions",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getRoleById = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { role_id: id } = req.params;
    const data = await KnexB2BLms("corp_roles")
      .select("id", "name", "permission", "is_global")
      .where({ id })
      .first();

    if (!data) {
      throw new BadRequest("Invalid Role ID");
    }
    return res.status(200).json({
      status: "success",
      message: "Role Details",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.store = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const {
      name,
      privileges,
      status = "active",
      company_id = "",
      is_global = 0,
    } = req.body;
    if (!name || !company_id) {
      throw new BadRequest("Required data is missing");
    }

    const corpRole = {
      name,
      permission: JSON.stringify(privileges),
      status,
      company_id,
      is_global,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const response = await KnexB2BLms("corp_roles")
      .insert(corpRole)
      .returning(["id"]);

    return res.status(201).json({
      status: "success",
      message: "Role Created",
      data: response,
    });
  } catch (error) {
    return next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { role_id: id } = req.params;
    const role = await KnexB2BLms("corp_roles").where({ id }).first();
    if (!role) {
      throw new BadRequest("Invalid Role Id");
    }
    const { name, privileges, status, company_id, is_global } = req.body;

    const corpRole = {
      name: name || role.name,
      permission: JSON.stringify(privileges) || role.permission,
      status: status || role.status,
      company_id: id == 1 ? 0 : company_id || role.company_id,
      is_global: is_global || role.is_global,
      updated_at: new Date(),
    };
    await KnexB2BLms("corp_roles").where({ id }).update(corpRole);

    return res.status(200).json({
      status: "success",
      message: "Role Updated",
      data: id,
    });
  } catch (error) {
    return next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { role_id: id } = req.params;
    if (!id) {
      throw new BadRequest("Role Id id missing.");
    }

    const [{ count: role_users_count }] = await KnexB2BLms("corp_role_user")
      .where("role_id", id)
      .count();

    if (role_users_count > 0) {
      throw new BadRequest("Role is assigned to users.");
    }
    await KnexB2BLms("corp_roles").where({ id }).delete();

    return res.status(200).json({
      status: "success",
      message: "Role Deleted",
    });
  } catch (error) {
    return next(error);
  }
};

exports.getRoles = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { company_id, page = 1, per_page = 10, search = null } = req.query;
    if (!company_id) {
      throw new BadRequest("Company id not found");
    }
    const getCompanyRole = await KnexB2BLms("corp_company")
      .where({ id: company_id })
      .first("default_role");

    const data = await KnexB2BLms("corp_roles")
      .select(
        "id",
        "name",
        "permission",
        "is_global",
        "created_at",
        "company_id"
      )
      .where(function () {
        this.where("company_id", company_id);
        this.where("status", "active");
        if (search) {
          this.whereRaw(`LOWER(name) LIKE '%${search.toLowerCase()}%'`);
        }
      })
      .orWhere("name", getCompanyRole.default_role)
      .orderBy("id", "desc");

    return res.status(200).json({
      status: "success",
      message: "Roles List",
      data,
    });
  } catch (error) {
    return next(error);
  }
};
