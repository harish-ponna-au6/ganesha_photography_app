// NPM packages
const [{ sign }, { compare }] = [require("jsonwebtoken", require("bcryptjs"))]

// Models
const Admin = require("../models/Admin")
const Editor = require("../models/Editor")
const Customer = require("../models/Customer")
const Order = require("../models/Order")


module.exports = {
    async login(req, res) {
        try {
            var email = req.body.email;
            var password = req.body.password;
            if (!email || !password) return res.json({ error: "Incorrect credentials" });
            const admin = await Admin.findOne({ email });
            if (!admin) return res.json({ error: "Incorrect credentials(email not found)" });
            const isMatched = await compare(password, admin.password);
            if (!isMatched) return res.send({ error: "Incorrect credentials(password not matched)" });
            const token = await sign({ _id: admin._id }, process.env.JSON_WEB_TOKEN_SECRET, { expiresIn: "1d" })
            admin.jsonWebToken = token;
            admin.save()
            const totalEditorsCount = await Editor.find().countDocuments()
            const requestedEditorsCount = await Editor.find({ status: `requested` }).countDocuments()
            const activeEditorsCount = await Editor.find({ status: `active` }).countDocuments()
            const blockedEditorsCount = await Editor.find({ status: `blocked` }).countDocuments()
            return res.json({ data: [{ totalEditorsCount, requestedEditorsCount, activeEditorsCount, blockedEditorsCount }], jsonWebToken: token })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },
    async filterEditors(req, res) {
        try {
            const editors = await Editor.find({ status: `${req.query.status}` }).sort({ createdAt: -1 })
            const count = editors.length
            return res.json({ data: editors, count })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },
    async searchEditors(req, res) {
        try {
            const officeName = req.query.officeName
            const editors = await Editor.find({ officeName: { $regex: `${officeName}`, $options: "i" } }).sort({ officeName: 1 })
            const count = editors.length
            return res.json({ data: editors, count })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },

    async viewSingleEditor(req, res) {
        try {
            const editorId = req.params.editorId
            const editor = await Editor.findOne({ _id: editorId })
            return res.json({ data: [editor], count: 1 })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },
    async updateEditor(req, res) {
        try {
            const editorId = req.query.editorId
            var status = req.query.status
            await Editor.findOneAndUpdate({ _id: editorId },{status})
            return res.json({ message: "editor updated successfully" })
        } catch (error) {
            return res.status(500).send({ error: error.message })
        }
    },
    async forgotPassword(req, res) {
        try {
            const email = req.body.email
            const mobile = Number(req.body.mobile)
            if (!email || !mobile) return res.json("enter email and mobile number")
            const admin = await Admin.findOne({ email, mobile });
            if (!admin) return res.json({ error: "Incorrect Credentials " })
            const rawPassword = (Math.floor(Math.random() * 100000000)).toString();
            const hashedPassword = await hash(rawPassword, 10)
            admin.password = hashedPassword;
            admin.save();
            forgotPasswordMailing(req.body.email, rawPassword)
            return res.json({ message: "A System generated password has been sent to your email successfully. Login with that password and edit your password in profile section if needed" })
        }
        catch (error) {
            return res.json({ error: error.message })
        }
    },
    
    async changePassword(req, res) {
        try {
            const currentPassword = req.body.currentPassword
            const newPassword = req.body.newPassword
            const isVerified = await compare(currentPassword, req.admin.password)
            if (!isVerified) return res.json({ error: "current password is wrong" })
            const hashedPassword = await hash(newPassword, 10)
            await Admin.findOneAndUpdate({ _id: req.admin._id }, { password: hashedPassword })
            return res.json({ message: "admin password changed successfully" })
        } catch (error) {
            return res.status(500).send({ error: error.message })
        }
    },

    async logout(req, res) {
        try {
            await Admin.findOneAndUpdate({ _id: req.admin._id }, { jsonWebToken: null })
            return res.json({ data: [{ message: "admin logged out successfully" }] });
        } catch (error) {
            res.status(404).send({ error: error.message })
        }
    },

}