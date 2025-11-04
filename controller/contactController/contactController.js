const asyncHandler = require("express-async-handler");
const Contact = require("../../models/Contact/Contact");
const sendEmail = require("../../utils/sendEmail");

exports.createContact = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, phone, subject, message } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !subject || !message) {
        res.status(400);
        throw new Error("All fields are required");
    }

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Create contact
    const contact = await Contact.create({
        firstName,
        lastName,
        phone,
        email,
        subject,
        message,
        ipAddress,
        userAgent
    });

    // Helper functions
    const getSubjectText = (subject) => {
        const subjects = {
            'admission': 'Admission Process',
            'courses': 'Course Information', 
            'fees': 'Fee Structure',
            'career': 'Career Counseling',
            'visit': 'Campus Tour',
            'other': 'General Inquiry'
        };
        return subjects[subject] || subject;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Admin email
    const adminEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center;">
                <h1>New Contact Form Submission</h1>
                <p>Gaikwad Classes</p>
            </div>
            
            <div style="padding: 20px; background: #f8fafc;">
                <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <strong>Submitted:</strong> ${formatDate(contact.createdAt)}
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                    <h3 style="color: #059669; margin-top: 0;">Contact Information</h3>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                    <h3 style="color: #059669; margin-top: 0;">Inquiry Details</h3>
                    <p><strong>Subject:</strong> ${getSubjectText(subject)}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 5px;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                </div>

                <div style="text-align: center; margin-top: 25px;">
                    <a href="mailto:${email}" style="background: #059669; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; margin: 5px;">
                        Reply to ${firstName}
                    </a>
                </div>
            </div>

            <div style="text-align: center; padding: 20px; background: #1f2937; color: white;">
                <p><strong>Gaikwad Classes</strong></p>
                <p>Excellence in Education Since 2013</p>
            </div>
        </div>
    `;

    // User confirmation email
    const userEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center;">
                <h1>Thank You for Contacting Us</h1>
                <p>Gaikwad Classes</p>
            </div>
            
            <div style="padding: 20px; background: #f8fafc;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #059669;">Hello ${firstName}!</h2>
                    <p>We've received your inquiry and will contact you within 2-4 hours.</p>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                    <h3 style="color: #059669; margin-top: 0;">Your Inquiry Summary</h3>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <p><strong>Subject:</strong> ${getSubjectText(subject)}</p>
                    <p><strong>Submitted:</strong> ${formatDate(contact.createdAt)}</p>
                </div>

                <div style="background: #d1fae5; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong>Response Time: 2-4 Hours</strong>
                </div>
            </div>

            <div style="text-align: center; padding: 20px; background: #1f2937; color: white;">
                <p><strong>Gaikwad Classes</strong></p>
                <p>📍 Pune | 📞 +91 98765 43210 | ✉️ info@gaikwadclasses.com</p>
            </div>
        </div>
    `;

    try {
        // Send emails
        await sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: `New Contact: ${getSubjectText(subject)} - ${firstName} ${lastName}`,
            html: adminEmailHtml
        });

        await sendEmail({
            to: email,
            subject: 'Thank You for Contacting Gaikwad Classes',
            html: userEmailHtml
        });

        res.status(201).json({
            success: true,
            message: 'Contact form submitted successfully',
            data: {
                id: contact._id,
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                subject: contact.subject
            }
        });

    } catch (emailError) {
        console.error('Email sending failed:', emailError);
        
        res.status(201).json({
            success: true,
            message: 'Contact form submitted successfully',
            data: {
                id: contact._id,
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                subject: contact.subject
            }
        });
    }
});

exports.getContacts = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    let query = {};
    if (status && status !== 'all') {
        query.status = status;
    }

    const contacts = await Contact.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Contact.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
        success: true,
        data: contacts,
        pagination: {
            page,
            limit,
            total,
            totalPages
        }
    });
});

exports.getContactById = asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
        res.status(404);
        throw new Error('Contact not found');
    }

    res.status(200).json({
        success: true,
        data: contact
    });
});

exports.updateContactStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status value');
    }

    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
        res.status(404);
        throw new Error('Contact not found');
    }

    contact.status = status;
    await contact.save();

    res.status(200).json({
        success: true,
        message: 'Contact status updated',
        data: contact
    });
});

exports.getContactStats = asyncHandler(async (req, res) => {
    const stats = await Contact.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
    
    const total = await Contact.countDocuments();
    const newContacts = await Contact.countDocuments({ status: 'new' });

    res.status(200).json({
        success: true,
        data: {
            total,
            new: newContacts,
            byStatus: stats
        }
    });
});