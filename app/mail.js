var nodemailer = require('nodemailer'),
    // create reusable transporter object using the default SMTP transport
    //transporter = nodemailer.createTransport('smtps://berman.tim%40gmail.com:Shiznit!911@smtp.gmail.com'),
    transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'berman.tim@gmail.com',
            pass: 'Shiznit!911'
        }
    }),
    from = 'Tim Berman <berman.tim@gmail.com>';

module.exports.send = function (to, subject, body, callback) {
    var opts = {
        from: from,
        to: to,
        subject: subject,
        text: body,
        html: body
    };

    transporter.sendMail(opts, function(error, info){
        if(error){
            callback({success: false, error: error});
        } else {
            callback({success: true});
        }
    });
};