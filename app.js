require("dotenv").config();
const express = require('express');
const stripe = require('stripe')(process.env.PROD_PRI_KEY);
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const nodemailer = require('nodemailer');
const {google} = require('googleapis')


const app = express();
const OAuth2 = google.auth.OAuth2;

// Handlebars Middleware
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Set Static Folder
app.use(express.static(`${__dirname}/public`));

// Route Handling For Webpage
app.get('/', (req, res) => {
  res.render('index');
});
app.get('/services', (req, res) => {
  res.render('services');
});
app.get('/about', (req, res) => {
  res.render('about');
});
app.get('/faq', (req, res) => {
  res.render('faq');
});
app.get('/contact', (req, res) => {
  res.render('contact');
});

app.get('/scheduler', (req, res) => {
  res.render('scheduler', {
    stripePublishableKey: process.env.PROD_PUB_KEY,
  });
});

app.get('/rescheduler', (req, res) => {
  res.render('rescheduler', {
    stripePublishableKey: process.env.PROD_PUB_KEY,
  });
});

// Charge Route
app.post('/charge', (req, res) => {
  function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }
 
  const confirmationID = makeid(12);
  const amount = 3500;
  const name = req.body.name
  const date = req.body.date
  const email = req.body.email
  const address = req.body.address
  const phone = req.body.phone
  const message = req.body.message
  stripe.customers
    .create({
      email: req.body.stripeEmail,
      source: req.body.stripeToken,
    })
    .then((customer) =>
    
      stripe.charges.create({
        amount,
        description: 'ScoopyDooCrew Cleanup',
        currency: 'usd',
        customer: customer.id,
      })
    )
    .then((charge) => res.render('success'))
    .then(() => {
      const emailCred = process.env.EMAIL_USERNAME

      const OAuth2Client = new OAuth2(process.env.GOOGLE_CLOUD_PLAT_CLIENT_ID, process.env.GOOGLE_CLOUD_PLAT_CLIENT_SECRET)
      OAuth2Client.setCredentials({refresh_token: process.env.GOOGLE_CLOUD_REFRESH_TOKEN})

      const accessToken = OAuth2Client.getAccessToken();

      const outputScoopy = `
        <p>You have an appointment that needs scheduled. Please call <strong>${name}</strong></p>
        <h3>Contact Details</h3>
          <ul>  
            <li>Name: ${name}</li>
            <li>Scheduled Date: ${date}</li>
            <li>Email: ${email}</li>
            <li>Address: ${address}</li>
            <li>Phone: <a href="tel:${phone}">${phone}</a></li>
            <li>Customer Booking Confirmation ID: ${confirmationID} </li>
          </ul>
        <h3>Message</h3>
        <p>${message}</p>
    `;
    const outputCustomer = `
    <h1>Thank you ${name} for scheduling your first service!</h1>
    <p>You can expect a phone call confirming your time slot of the selected date <strong>${date}</strong>.</p>
    <p>Your confirmation ID is <strong>${confirmationID}</strong></p>
    <h2><strong>Welcome To The Crew !</strong></h2>
`;

      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
       service: process.env.SERVICE_TYPE,
       auth: {
         type: process.env.AUTH_TYPE,
         user: process.env.EMAIL_USERNAME,
         clientId: process.env.GOOGLE_CLOUD_PLAT_CLIENT_ID,
         clientSecret: process.env.GOOGLE_CLOUD_PLAT_CLIENT_SECRET,
         refreshToken: process.env.GOOGLE_CLOUD_REFRESH_TOKEN,
         accessToken: accessToken
       }
      });
      // setup email data with unicode symbols
      // To Self
      let mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: process.env.EMAIL_USERNAME,
        subject: 'Appointment Scheduled From Website',
        text: 'Schedule Time Slot',
        html: outputScoopy
      };
      // To Customer
      let mailOptionsCustomer = {
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: 'ScoopyDooCrew Service Confirmation',
        text: 'Welcome To The Crew',
        html: outputCustomer
      };
      // send mail with defined transport object to self
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        } 
            console.log('SELF |Message sent: %s', info.messageId);
            console.log('SELF |Preview URL: %s', nodemailer.getTestMessageUrl(info));
      });

      // Send confirmation mail to customer
      transporter.sendMail(mailOptionsCustomer, (error, info) => {
        if (error) {
          return console.log(error);
        } 
            console.log('CUSTOMER |Message sent: %s', info.messageId);
            console.log('CUSTOMER |Preview URL: %s', nodemailer.getTestMessageUrl(info));
      });
    })
});

// Reschedule Route
app.post('/charge-reschedule', (req, res) => {

  function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }
 
  const confirmationID = makeid(12);
  const name = req.body.name
  const date = req.body.date
  const email = req.body.email
  const address = req.body.address
  const phone = req.body.phone
  const message = req.body.message

  var weekly = req.body.weekly
  var biMonthly = req.body.biMonthly
  var monthly = req.body.monthly
  var oneTime = req.body.oneTime
  
  if(oneTime !== '0'){
    console.log("One Time appointment selected")
    var stripeDescription = `One Time appointment selected at the amount of $${oneTime}. Customer name: ${name}. Customer Address: ${address}`
    var reScheduleType = `One time appointment selected at amount of: $${oneTime}`
  }
  if(weekly !== '0'){
    console.log("Weekly Service selected")
    var stripeDescription = `Weekly service request at the amount of $${weekly}. Customer name: ${name}. Customer Address: ${address}`
    var reScheduleType = `Weekly service selected at amount of: $${weekly}`
  }
  if(biMonthly !== '0'){
    console.log("Bi-Monthly Service selected")
    var stripeDescription = `Bi Monthly service request at the amount of $${biMonthly}. Customer name: ${name}. Customer Address: ${address}`
    var reScheduleType = `Bi Monthly service selected at amount of: $${biMonthly}`
  }
  if(monthly !== '0'){
    console.log("Monthly Service selected")
    var stripeDescription = `Monthly service request at the amount of $${monthly}. Customer name: ${name}. Customer Address: ${address}`
    var reScheduleType = `Monthly service selected at amount of: $${monthly}`
  }
  var intWeekly = parseInt(weekly, 10)
  var intBiMonthly = parseInt(biMonthly, 10)
  var intMonthly = parseInt(monthly, 10)
  var intOneTime = parseInt(oneTime, 10)
  var newAmount = intWeekly += intBiMonthly += intMonthly += intOneTime;
  var amount = newAmount * 100;
  stripe.customers
    .create({
      name: req.body.name,
      email: req.body.stripeEmail,
      source: req.body.stripeToken,
    })
    .then((customer) =>
      stripe.charges.create({
        amount,
        description: stripeDescription,
        currency: 'usd',
        customer: customer.id,
      })
    )
    .then((charge) => res.render('success'))
    .then(() => {
      const emailCred = process.env.EMAIL_USERNAME

      const OAuth2Client = new OAuth2(process.env.GOOGLE_CLOUD_PLAT_CLIENT_ID, process.env.GOOGLE_CLOUD_PLAT_CLIENT_SECRET)
      OAuth2Client.setCredentials({refresh_token: process.env.GOOGLE_CLOUD_REFRESH_TOKEN})

      const accessToken = OAuth2Client.getAccessToken();

      const outputScoopy = `
        <p>You have an Re-Schedule appointment that needs scheduled. Please call <strong>${name}</strong></p>
        <h3>Contact Details</h3>
          <ul>  
            <li>Name: ${name}</li>
            <li>Scheduled Date: ${date}</li>
            <li>Email: ${email}</li>
            <li>Address: ${address}</li>
            <li>Phone: <a href="tel:${phone}">${phone}</a></li>
            <li>Customer Booking Confirmation ID: ${confirmationID} </li>
            <li>Type of Re-Schedule: ${reScheduleType}</li>
          </ul>
        <h3>Message</h3>
        <p>${message}</p>
    `;
    const outputCustomer = `
    <h1>Thank you ${name} for scheduling your next service! </h1>
    <p>You can expect a phone call confirming your time slot of the selected date <strong>${date}</strong>.</p>
    <p>Your confirmation ID is <strong>${confirmationID}</strong></p>
    <h2><strong>Glad to have you back !</strong></h2>
`;

      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
       service: process.env.SERVICE_TYPE,
       auth: {
         type: process.env.AUTH_TYPE,
         user: process.env.EMAIL_USERNAME,
         clientId: process.env.GOOGLE_CLOUD_PLAT_CLIENT_ID,
         clientSecret: process.env.GOOGLE_CLOUD_PLAT_CLIENT_SECRET,
         refreshToken: process.env.GOOGLE_CLOUD_REFRESH_TOKEN,
         accessToken: accessToken
       }
      });
      // setup email data with unicode symbols
      // To Self
      let mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: process.env.EMAIL_USERNAME,
        subject: 'Re-Scheduled Appointment From Website',
        text: 'Schedule Time Slot',
        html: outputScoopy
      };
      // To Customer
      let mailOptionsCustomer = {
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: 'ScoopyDooCrew Service Confirmation',
        text: 'Thank you for Re-Scheduling!',
        html: outputCustomer
      };
      // send mail with defined transport object to self
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        } 
            console.log('SELF |Message sent: %s', info.messageId);
            console.log('SELF |Preview URL: %s', nodemailer.getTestMessageUrl(info));
      });

      // Send confirmation mail to customer
      transporter.sendMail(mailOptionsCustomer, (error, info) => {
        if (error) {
          return console.log(error);
        } 
            console.log('CUSTOMER |Message sent: %s', info.messageId);
            console.log('CUSTOMER |Preview URL: %s', nodemailer.getTestMessageUrl(info));
      });
    })

})



const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
