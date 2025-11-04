const router = require("express").Router()
const contactController = require("../../controller/contactController/contactController");
const { adminProtect } = require("../../middleware/adminProtected");

router
    .post("/createContact", contactController.createContact)
    .get("/getContacts", adminProtect, contactController.getContacts)
    .get("/getContactById/:id", adminProtect, contactController.getContactById)
 
module.exports = router;
