// Models
const Admin = require("../models/Admin")
const Editor = require("../models/Editor")
const Customer = require("../models/Customer")
const Order = require("../models/Order")

// NPM Packages
const [{ sign }, { hash, compare }] = [require("jsonwebtoken"), require("bcryptjs")]

module.exports = {
    async editorRegister(req, res) {
        try {
            var { name, email, password, officeName, mobile, address } = req.body
            mobile = Number(mobile)
            const emailCheck = await Editor.findOne({ email })
            if (emailCheck) return res.json({ error: "Duplicate Email" });
            const editor = await new Editor({ name, email, password, officeName, mobile, address });
            const hashedPassword = await hash(password, 10);
            editor.password = hashedPassword;
            editor.save()
            res.json({ message: `Account created successfully` });
        }
        catch (error) {
            return res.json({ error: `${error.message}` });
        }
    },

    async editorLogin(req, res) {
        try {
            var email = req.body.email;
            var password = req.body.password;
            if (!email || !password) return res.json({ error: "Incorrect credentials" });
            const editor = await Editor.findOne({ email });
            if (!editor) return res.json({ error: "Incorrect credentials(email not found)" });
            const isMatched = await compare(password, editor.password);
            if (!isMatched) return res.send({ error: "Incorrect credentials(password not matched)" });
            if (editor.status == "requested") return res.json({ error: "Your account has not been activated yet, Please contact Admin for your account activation" })
            if (editor.status == "blocked") return res.json({ error: "Your account has been blocked due to misuse of web application, Please contact Admin for more information" })
            const token = await sign({ _id: editor._id }, process.env.JSON_WEB_TOKEN_SECRET, { expiresIn: "1d" })
            editor.jsonWebToken = token;
            editor.save()
            const customersCount = await Customer.find().countDocuments()
            const totalOrdersCount = await Order.find().countDocuments()
            const notStartedCount = await Order.find({ status: `not_started` }).countDocuments()
            const startedCount = await Order.find({ status: `started` }).countDocuments()
            const completedCount = await Order.find({ status: `completed`, isPaymentCompleted: `no`, }).countDocuments()
            const cancelledCount = await Order.find({ status: `cancelled` }).countDocuments()
            const paymentCompletedOrderCompletedCount = await Order.find({ status: `completed` }).countDocuments()
            return res.json({ data: [{ customersCount, totalOrdersCount, notStartedCount, startedCount, completedCount, cancelledCount, paymentCompletedOrderCompletedCount }], jsonWebToken: token })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },
    async editorForgotPassword(req, res) {
        try {
            const email = req.body.email
            const mobile = Number(req.body.mobile)
            if (!email || !mobile) return res.json("enter email and mobile number")
            const editor = await Editor.findOne({ email, mobile, status: "active" });
            if (!editor) return res.json({ error: "Incorrect Credentials " })
            const rawPassword = (Math.floor(Math.random() * 100000000)).toString();
            const hashedPassword = await hash(rawPassword, 10)
            editor.password = hashedPassword;
            editor.save();
            forgotPasswordMailing(req.body.email, rawPassword)
            return res.json({ message: "A System generated password has been sent to your email successfully. Login with that password and edit your password in profile section if needed" })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },
    async editorChangePassword(req, res) {
        try {
            const currentPassword = req.body.currentPassword
            const newPassword = req.body.newPassword
            const isVerified = await compare(currentPassword, req.editor.password)
            if (!isVerified) return res.json({ error: "current password is wrong" })
            const hashedPassword = await hash(newPassword, 10)
            await Editor.findOneAndUpdate({ _id: req.admin._id }, { password: hashedPassword })
            return res.json({ message: "Editor password changed successfully" })
        } catch (error) {
            return res.status(500).send({ error: error.message })
        }
    },
    async editorLogout(req, res) {
        try {
            await Editor.findOneAndUpdate({ _id: req.editor._id }, { jasonWebToken: null })
            return res.json({ data: [{ message: "editor successfully logged out" }] });
        } catch (error) {
            res.status(404).send({ error: error.message })
        }
    },

    async editorCreateCustomerAccount(req, res) {
        try {
            var { name, email, password, officeName, mobile, address } = req.body
            mobile = Number(mobile)
            const customer = await Customer.findOne({ email })
            if (customer) {
                if ((customer.editors).includes(req.editor._id)) {
                    return res.json({ error: "Duplicate Email" })
                }
                (customer.editors).push(req.editor._id)
                customer.save()
                const editor = await Editor.findOne({ _id: req.editor._id })
                editor.customers.push(customer._id)
                editor.save()
                return res.json({ message: "Customer account already existed in the database, now it is linked to your account" })
            }
            const newCustomer = await new Customer({ name, email, password, officeName, mobile, address });
            const hashedPassword = await hash(password, 10);
            newCustomer.password = hashedPassword;
            newCustomer.save()
            accountCreatedMailing(email, password)
            res.send({ message: `customer account has been created successfully and a mail has been sent to his account with email and password` });
        }
        catch (error) {
            return res.json({ error: `${error.message}` });
        }
    },
    async editorCreateOrder(req, res) {
        try {
            var { customerId, titleOfOrder, typeOfOrder, outPutFormat, estimatedDateOfCompletion, allotedEmployee, description, totalAmountInINR, advanceAmountInINR, status, isPaymentCompleted } = req.body
            totalAmountInINR = Number(totalAmountInINR)
            advanceAmountInINR = Number(advanceAmountInINR)
            await new Order({ customerId, editorId: req.editor._d, titleOfOrder, typeOfOrder, description, outPutFormat, estimatedDateOfCompletion, allotedEmployee, totalAmountInINR, advanceAmountInINR, status, isPaymentCompleted }).save()
            return res.json({ message: "order created successfully" })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },
    async editorUpdateOrder(req, res) {
        try {
            const orderId = req.params.orderId
            var status = req.body.status
            var isPaymentCompleted = req.body.isPaymentCompleted
            const order = await Order.findOne({ _id: orderId, editorId: req.editor._id })
            if (status == "") status = order.status
            if (isPaymentCompleted == "") isPaymentCompleted = order.isPaymentCompleted
            order.status = status
            order.isPaymentCompleted = isPaymentCompleted
            order.save()
            return res.json({ message: "order updated successfully" })
        } catch (error) {
            return res.status(500).send({ error: error.message })
        }
    },

    async editorCustomerOfficeNames(req, res) {
        try {
            const customers = await Customer.find({ editors: req.editor._id }).sort({ officeName: 1 })
            const count = customers.length
            var customerOfficeNames = []
            customers.forEach(ele => {
                customerOfficeNames.push({ customerId: ele._id, officeName: ele.officeName })
            });
            return res.json({ data: customerOfficeNames, count })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },

    async editorFilterOrders(req, res) {
        try {
            if (req.query.status == "completed") {
                const orders = await Order.find({ status: req.query.status, isPaymentCompleted: "false", editorId: req.editor._id }).sort({ createdAt: -1 })
                const count = orders.length
                return res.json({ data: orders, count })
            }
            else {
                const orders = await Order.find({ status: req.query.status, editorId: req.editor._id }).sort({ createdAt: -1 })
                const count = orders.length
                return res.json({ data: orders, count })
            }
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },

    async editorPaymentDoneAndCompletedOrders(req, res) {
        try {
            const orders = await Order.find({ isPaymentCompleted: `true`, status: `completed`, editorId: req.editor._id }).sort({ createdAt: -1 })
            const count = orders.length
            return res.json({ data: orders, count })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },

    async editorFilterCustomers(req, res) {
        try {
            const customers = await Customer.find({ status: req.query.status, editorId: req.editor._id }).sort({ createdAt: -1 })
            const count = customers.length
            return res.json({ data: customers, count })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },

    async editorViewSingleCustomer(req, res) {
        try {
            const customerId = req.params.customerId
            const customer = await Editor.findOne({ _id: customerId, editors: editorId })
            return res.json({ data: [editor], count: 1 })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },
    async editorRemoveCustomer(req, res) {
        try {
            const customerId = req.query.customerId
            const customer = await Customer.findOne({ _id: customerId, editors: req.editor._id })
            const index = (customer.editors).indexOf(`${req.editor._id}`)
                (customer.editors).splice(index, 1)
            customer.save()
            const editor = await Editor.findOne({ _id: req.editor._id })
            const index = (editor.customers).indexOf(customerId)
                (editor.customers).splice(index, 1)
            editor.save()
            return res.json({ message: "customer removed successfully" })
        } catch (error) {
            return res.status(500).send({ error: error.message })
        }
    },
    async editorSearchCustomers(req, res) {
        try {
            const officeName = req.query.officeName
            const customer = await Customer.find({ officeName: { $regex: `${officeName}`, $options: "i" }, editors: req.editor._id }).sort({ officeName: 1 })
            const count = customer.length
            return res.json({ data: customers, count })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },

    async editorCustomerOrders(req, res) {
        try {
            const customerId = req.params.customerId
            const orders = await Order.find({ customerId, editorId: req.editor._id }).sort({ createdAt: -1 })
            const count = orders.length
            return res.json({ data: orders, count })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },

    async editorSearchOrders(req, res) {
        try {
            const titleOfOrder = req.query.titleOfOrder
            const orders = await Order.find({ titleOfOrder: { $regex: `${titleOfOrder}`, $options: "i" }, editorId: req.editor._id }).sort({ createdAt: -1 })
            const count = orders.length
            return res.json({ data: orders, count })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },

    async editorViewSingleOrder(req, res) {
        try {
            const orderId = req.params.orderId
            const order = await Order.findOne({ _id: orderId, editorId: req.editor._id })
            return res.json({ data: [order], count: 1 })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },
}