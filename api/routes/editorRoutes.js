// NPM Package
const router = require("express").Router();

// controllers
const {
    editorLogin,
    editorRegister,
    editorForgotPassword,
    editorChangePassword,
    editorLogout,
    editorCreateCustomerAccount,
    editorCustomerOfficeNames,
    editorCreateOrder,
    editorViewSingleOrder,
    editorUpdateOrder,
    editorFilterOrders,
    editorSearchOrders,
    editorPaymentDoneAndCompletedOrders,
    editorAllCustomers,
    editorSearchCustomers,
    editorViewSingleCustomer,
    editorRemoveCustomer,
    editorCustomerOrders,

} = require("../controllers/editorControllers")

// middlewares
const { authenticateEditor } = require("../middlewares/authenticate")
const { registrationValidation, orderValidation } = require("../middlewares/validations")



// --------------------------get route------------------------------------------

router.get(`/api/editor/get-customer-ids`, authenticateEditor, editorCustomerOfficeNames)
router.get(`/api/editor/filter-orders`, authenticateEditor,
    editorFilterOrders) //?status = not_started || started || completed || cancelled
router.get(`/api/editor/payment-done-and-completed-orders`, authenticateEditor, editorPaymentDoneAndCompletedOrders)
router.get(`/api/editor/all-customers`, authenticateEditor, editorAllCustomers)
router.get(`/api/editor/view-single-customer/:customerId`, authenticateEditor, editorViewSingleCustomer)
router.get(`/api/editor/search/customers-by-office-name`, authenticateEditor, editorSearchCustomers)//?studioName = ${query}
router.get(`/api/editor/customer-orders/:customerId`, authenticateEditor, editorCustomerOrders)
router.get(`/api/editor/search/orders-by-title`, authenticateEditor, editorSearchOrders) // ?titleOfOrder =  ${query} 
router.get(`/api/editor/view-single-order/:orderId`, authenticateEditor, editorViewSingleOrder)



// --------------------------post routes------------------------------------------
router.post(`/api/editor/register`, registrationValidation, editorRegister);
router.post(`/api/editor/login`, editorLogin);
router.post(`/api/editor/create-customer-account`, authenticateEditor, registrationValidation, editorCreateCustomerAccount);
router.post(`/api/editor/create-order`, authenticateEditor, orderValidation, editorCreateOrder);



// --------------------------update routes------------------------------------------
router.patch(`/api/editor/forgot-password`, editorForgotPassword)
router.patch(`/api/editor/change-password`, authenticateEditor, editorChangePassword)
router.patch(`/api/editor/update-order/:orderId`, authenticateEditor, editorUpdateOrder)



// --------------------------delete routes------------------------------------------
router.delete(`/api/edior/remove-customer/:customerId`, authenticateEditor, editorRemoveCustomer)
router.delete(`/api/editor/logout`, authenticateEditor, editorLogout);


module.exports = router
