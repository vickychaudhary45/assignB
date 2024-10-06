// // Data copied from corp_roles to corp_roles_1

// // const initializeConnections = require("../config/db"); // Adjust the path as needed

// // (async () => {
// //   const { KnexB2BLms } = await initializeConnections();

// //   try {
// //     // Copy everything from corp_roles to corp_roles_1
// //     // await KnexB2BLms.raw(`
// //     //   INSERT INTO corp_roles_1
// //     //   SELECT *
// //     //   FROM corp_roles;
// //     // `);

// //     // console.log("Data copied successfully from corp_roles to corp_roles_1");

// //     // // Update the permission column in corp_roles_1 based on the id from corp_roles
// //     await KnexB2BLms.raw(`
// //       UPDATE corp_roles_1
// //       SET permission = corp_roles.permission
// //       FROM corp_roles
// //       WHERE corp_roles_1.id = corp_roles.id;
// //     `);

// //     // console.log("Permissions updated successfully from corp_roles to corp_roles_1");

// //     // // Delete rows from corp_roles_1 if their id is not present in corp_roles
// //     // await KnexB2BLms.raw(`
// //     //   DELETE FROM corp_roles_1
// //     //   WHERE id NOT IN (SELECT id FROM corp_roles);
// //     // `);

// //     // console.log("Orphaned rows deleted successfully from corp_roles_1");
// //   } catch (error) {
// //     console.error("Error during operations:", error.message);
// //   }
// // })();

// // ids to be updated according to the new changes in permissions

// // const fs = require("fs");
// // const initializeConnections = require("../config/db"); // Adjust the path as needed

// // (async () => {
// //   const { KnexB2BLms } = await initializeConnections();
// //   async function updatePermissions() {
// //     const successIds = [];
// //     const failedIds = [];
// //     const unchangedIds = [];

// //     try {
// //       const roles = await KnexB2BLms("corp_roles_1").select("id", "permission");

// //       // loop: Apply transformation rules
// //       for (const role of roles) {
// //         let permissions;
// //         try {
// //           permissions = JSON.parse(role.permission); // Parse the permissions array
// //           if (!Array.isArray(permissions)) {
// //             throw new Error("Parsed permissions is not an array");
// //           }
// //         } catch (error) {
// //           console.error(
// //             `Error parsing permissions for role ID ${role.id}:`,
// //             error.message
// //           );
// //           failedIds.push(role.id);
// //           continue; // Skip this role and move to the next one
// //         }

// //         // Convert permissions to a Set for easier manipulation
// //         const permissionSet = new Set(permissions);
// //         const originalPermissions = new Set(permissionSet); // Keep a copy of the original permissions

// //         // Apply transformation rules
// //         try {
// //           if (
// //             permissionSet.has(1) &&
// //             permissionSet.has(2) &&
// //             permissionSet.has(69)
// //           ) {
// //             permissionSet.delete(1);
// //             permissionSet.delete(2);
// //             permissionSet.delete(69);
// //             permissionSet.add(5);
// //             permissionSet.add(7);
// //             permissionSet.add(8);
// //             permissionSet.add(9);
// //             permissionSet.add(10);
// //             permissionSet.add(16);
// //             permissionSet.add(203);
// //             permissionSet.add(205);
// //             permissionSet.add(209);
// //             permissionSet.add(211);
// //           } else if (permissionSet.has(69) && permissionSet.has(1)) {
// //             permissionSet.delete(69);
// //             permissionSet.delete(1);
// //             permissionSet.add(5);
// //             permissionSet.add(7);
// //             permissionSet.add(8);
// //             permissionSet.add(9);
// //             permissionSet.add(10);
// //             permissionSet.add(203);
// //             permissionSet.add(205);
// //             permissionSet.add(209);
// //             permissionSet.add(211);
// //           } else if (permissionSet.has(69) && permissionSet.has(2)) {
// //             permissionSet.delete(69);
// //             permissionSet.delete(2);
// //             permissionSet.add(5);
// //             permissionSet.add(7);
// //             permissionSet.add(8);
// //             permissionSet.add(9);
// //             permissionSet.add(10);
// //             permissionSet.add(16);
// //             permissionSet.add(203);
// //             permissionSet.add(209);
// //             permissionSet.add(211);
// //           } else if (permissionSet.has(1) && permissionSet.has(2)) {
// //             permissionSet.delete(1);
// //             permissionSet.delete(2);
// //             permissionSet.add(16);
// //             permissionSet.add(205);
// //             permissionSet.add(209);
// //           } else if (permissionSet.has(69)) {
// //             permissionSet.delete(69);
// //             permissionSet.add(5);
// //             permissionSet.add(7);
// //             permissionSet.add(8);
// //             permissionSet.add(9);
// //             permissionSet.add(10);
// //             permissionSet.add(203);
// //             permissionSet.add(211);
// //           } else if (permissionSet.has(1)) {
// //             permissionSet.delete(1);
// //             permissionSet.add(205);
// //             permissionSet.add(209);
// //           } else if (permissionSet.has(2)) {
// //             permissionSet.delete(2);
// //             permissionSet.add(16);
// //             permissionSet.add(209);
// //           }

// //           // Convert the Set back to an array
// //           permissions = Array.from(permissionSet);

// //           // Check if the permissions have changed
// //           if (
// //             JSON.stringify(Array.from(originalPermissions)) !==
// //             JSON.stringify(permissions)
// //           ) {
// //             // Update the role in the database
// //             await KnexB2BLms("corp_roles_1")
// //               .where("id", role.id)
// //               .update({ permission: JSON.stringify(permissions) }); // Convert back to JSON string

// //             successIds.push(role.id);
// //           } else {
// //             unchangedIds.push(role.id);
// //           }
// //         } catch (error) {
// //           console.error(
// //             `Error modifying permissions for role ID ${role.id}:`,
// //             error.message
// //           );
// //           failedIds.push(role.id);
// //         }
// //       }

// //       console.log("Permissions updated successfully");
// //       console.log("Successful:", successIds);
// //       console.log("Unchanged:", unchangedIds);
// //       console.log("Failed:", failedIds);

// //       // Create a JSON object with the results
// //       const result = {
// //         message: "Permissions updated successfully",
// //         successful: successIds,
// //         unchanged: unchangedIds,
// //         failed: failedIds,
// //       };

// //       // Write the JSON object to a file
// //       fs.writeFile(
// //         "modification_results.json",
// //         JSON.stringify(result, null, 2),
// //         (err) => {
// //           if (err) {
// //             console.error("Error writing to file:", err);
// //           } else {
// //             console.log("Results written to modification_results.json");
// //           }
// //         }
// //       );
// //     } catch (error) {
// //       console.error("Error updating permissions:", error.message);
// //     }
// //   }

// //   await updatePermissions();
// // })();

// // For QA only DB only

// // 1. remove random ids
// // const initializeConnections = require("../config/db"); // Adjust the path as needed

// // const allPermissionsiids = [
// //   5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 18, 199, 200, 201, 202, 203, 204, 205,
// //   206, 207, 208, 209, 210, 211,
// // ];

// // (async () => {
// //   const { KnexB2BLms } = await initializeConnections();

// //   try {
// //     // Fetch all rows from corp_roles_1
// //     const roles = await KnexB2BLms("corp_roles_1").select("id", "permission");

// //     for (const role of roles) {
// //       let permissions;
// //       try {
// //         permissions = JSON.parse(role.permission); // Parse the permissions array
// //         if (!Array.isArray(permissions)) {
// //           throw new Error("Parsed permissions is not an array");
// //         }
// //       } catch (error) {
// //         console.error(
// //           `Error parsing permissions for role ID ${role.id}:`,
// //           error.message
// //         );
// //         continue; // Skip this role and move to the next one
// //       }

// //       // Filter out IDs that are not in allPermissionsiids
// //       const filteredPermissions = permissions.filter((id) =>
// //         allPermissionsiids.includes(id)
// //       );

// //       // Update the role in the database if the permissions array has changed
// //       if (JSON.stringify(permissions) !== JSON.stringify(filteredPermissions)) {
// //         try {
// //           await KnexB2BLms("corp_roles_1")
// //             .where("id", role.id)
// //             .update({ permission: JSON.stringify(filteredPermissions) }); // Convert back to JSON string

// //           // also add below what permission is modified
// //           console.log(`Updated permissions for role ID ${role.id}`);
// //         } catch (error) {
// //           console.error(
// //             `Error updating permissions for role ID ${role.id}:`,
// //             error.message
// //           );
// //         }
// //       }
// //     }
// //   } catch (error) {
// //     console.error("Error during operations:", error.message);
// //   }
// // })();

// // 2. Add missing ids if it is having parent id
// // const initializeConnections = require("../config/db"); // Adjust the path as needed

// // const parentToSubmenu = {
// //   211: [5, 7, 8, 9, 10, 203],
// //   199: [200, 201, 202],
// //   210: [12, 13, 14, 15, 207],
// //   209: [16, 18, 204, 205, 206],
// // };

// // (async () => {
// //   const { KnexB2BLms } = await initializeConnections();

// //   try {
// //     // Fetch all rows from corp_roles_1
// //     const roles = await KnexB2BLms("corp_roles_1").select("id", "permission");

// //     for (const role of roles) {
// //       let permissions;
// //       try {
// //         permissions = JSON.parse(role.permission); // Parse the permissions array
// //         if (!Array.isArray(permissions)) {
// //           throw new Error("Parsed permissions is not an array");
// //         }
// //       } catch (error) {
// //         console.error(
// //           `Error parsing permissions for role ID ${role.id}:`,
// //           error.message
// //         );
// //         continue; // Skip this role and move to the next one
// //       }

// //       let updated = false;

// //       // Check if the permission array contains any of the keys
// //       for (const key of Object.keys(parentToSubmenu)) {
// //         const keyInt = parseInt(key, 10);
// //         console.log(keyInt, 'keyInt');

// //         if (permissions.includes(keyInt)) {
// //           // Check if it contains at least one element from the corresponding array
// //           const hasSubmenuItem = parentToSubmenu[key].some(submenuId =>
// //             permissions.includes(submenuId)
// //           );

// //           if (!hasSubmenuItem) {
// //             // Add the first element from the corresponding array if none are present
// //             permissions.push(parentToSubmenu[key][0]);
// //             updated = true;
// //           }
// //         }
// //       }

// //       // Update the role in the database if the permissions array has changed
// //       if (updated) {
// //         try {
// //           await KnexB2BLms("corp_roles_1")
// //             .where("id", role.id)
// //             .update({ permission: JSON.stringify(permissions) }); // Convert back to JSON string
// //           console.log(`Updated permissions for role ID ${role.id}`);
// //         } catch (error) {
// //           console.error(
// //             `Error updating permissions for role ID ${role.id}:`,
// //             error.message
// //           );
// //         }
// //       }
// //     }
// //   } catch (error) {
// //     console.error("Error during operations:", error.message);
// //   }
// // })();

// // 3. Add missing ids if it is having sub menu id
// const initializeConnections = require("../config/db"); // Adjust the path as needed

// const parentToSubmenu = {
//   211: [5, 7, 8, 9, 10, 203],
//   199: [200, 201, 202],
//   210: [12, 13, 14, 15, 207],
//   209: [16, 18, 204, 205, 206],
// };

// (async () => {
//   const { KnexB2BLms } = await initializeConnections();

//   try {
//     // Fetch all rows from corp_roles_1
//     const roles = await KnexB2BLms("corp_roles_1").select("id", "permission");

//     for (const role of roles) {
//       let permissions;
//       try {
//         permissions = JSON.parse(role.permission); // Parse the permissions array
//         if (!Array.isArray(permissions)) {
//           throw new Error("Parsed permissions is not an array");
//         }
//       } catch (error) {
//         console.error(
//           `Error parsing permissions for role ID ${role.id}:`,
//           error.message
//         );
//         continue; // Skip this role and move to the next one
//       }

//       let updated = false;

//       // Check if the permission array contains any submenu ID
//       for (const [parentId, submenuIds] of Object.entries(parentToSubmenu)) {
//         const parentIdInt = parseInt(parentId, 10);
//         const hasParentId = permissions.includes(parentIdInt);
//         const hasSubmenuId = submenuIds.some((submenuId) =>
//           permissions.includes(submenuId)
//         );

//         if (hasSubmenuId && !hasParentId) {
//           // Add the parent ID if not already present
//           permissions.push(parentIdInt);
//           updated = true;
//         }
//       }

//       // Update the role in the database if the permissions array has changed
//       if (updated) {
//         try {
//           await KnexB2BLms("corp_roles_1")
//             .where("id", role.id)
//             .update({ permission: JSON.stringify(permissions) }); // Convert back to JSON string
//           console.log(`Updated permissions for role ID ${role.id}`);
//         } catch (error) {
//           console.error(
//             `Error updating permissions for role ID ${role.id}:`,
//             error.message
//           );
//         }
//       }
//     }
//   } catch (error) {
//     console.error("Error during operations:", error.message);
//   }
// })();
