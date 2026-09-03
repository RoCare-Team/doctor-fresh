// Layout copy that exists only in the theme.
//
// Everything the database holds — products, categories, blogs, the 22,195 SEO
// pages, brand details, footer links, policies, slides, deals — is read from
// SQL through lib/catalog.js. What is left here is presentation the PHP site
// also hardcodes in its views and stores in no table: which trust badges the
// theme shows, the water-test panel, the field lists of the forms, the store
// addresses and the careers intro.
//
// Nothing in this file is product, price, page or customer data.

/**
 * The home page's title and description.
 *
 * These are the only meta tags the PHP site writes into its view rather than
 * reading from a table: `general_settings` holds "Doctor Fresh" and "Meta Des"
 * in `system_title` and `meta_description`, which the live home page ignores.
 * Every other page carries its own meta in its own row, so this is the one
 * place the copy has to live. Kept identical to what doctorfresh.in serves.
 */
export const homeMeta = {
  title: 'Doctor Fresh - Complete Solution for Water Purifiers, Home and Kitchen Appliances',
  description: 'Doctor Fresh Offers best Water purifier, Kitchen Appliances, Air Purifiers & Vacuum Cleaners. We are most trusted brand in home appliances industries.',
};

export const trustBadges = [
  {
    "icon": "/uploads/others/free.png",
    "title": "Free Shipping"
  },
  {
    "icon": "/uploads/others/money.png",
    "title": "Money Back Guarantee"
  },
  {
    "icon": "/uploads/others/install.png",
    "title": "Free Installation"
  },
  {
    "icon": "/uploads/others/easy.png",
    "title": "Easy EMI Options"
  },
  {
    "icon": "/uploads/others/service24.png",
    "title": "Service Within 24 Hour"
  },
  {
    "icon": "/uploads/others/order.png",
    "title": "Online Order Tracking"
  }
];
export const waterTest = {
  "title": "Free water quality test by Doctor Fresh Water Analyst",
  "parameters": [
    {
      "icon": "/uploads/others/tds.png",
      "label": "TDS"
    },
    {
      "icon": "/uploads/others/ph.png",
      "label": "PH"
    },
    {
      "icon": "/uploads/others/hardness.png",
      "label": "Hardness"
    },
    {
      "icon": "/uploads/others/orp.png",
      "label": "ORP"
    },
    {
      "icon": "/uploads/others/tit.png",
      "label": "Turbidity"
    },
    {
      "icon": "/uploads/others/color.png",
      "label": "Color/Smell"
    }
  ],
  "formTitle": "Book Free Water Test",
  "enquiryType": "Book Free Water Test",
  "fields": [
    {
      "type": "text",
      "name": "name",
      "placeholder": "Name",
      "required": true
    },
    {
      "type": "email",
      "name": "email",
      "placeholder": "Email",
      "required": true
    },
    {
      "type": "number",
      "name": "number",
      "placeholder": "Your 10 Digit Number",
      "required": true
    }
  ]
};
export const headerNav = [
  {
    "label": "Products",
    "href": "/all-category"
  },
  {
    "label": "Blogs",
    "href": "/blogs"
  },
  {
    "label": "Contact",
    "href": "/contact"
  }
];
export const contactPage = {
  "metaTitle": "Contact",
  // The live page ships the installer's "Meta Des" placeholder here, which is
  // no description at all. Left empty so the page's own copy is used.
  "metaDescription": "",
  "formTitle": "Contact Form",
  "fields": [
    {
      "tag": "input",
      "type": "text",
      "name": "name",
      "placeholder": "Name",
      "required": true
    },
    {
      "tag": "input",
      "type": "email",
      "name": "email",
      "placeholder": "Email",
      "required": true
    },
    {
      "tag": "input",
      "type": "number",
      "name": "mobile",
      "placeholder": "Mobile",
      "required": true
    },
    {
      "tag": "textarea",
      "type": "textarea",
      "name": "message",
      "placeholder": "Message",
      "required": true
    }
  ],
  "otherInfoTitle": "Other Contact Information"
};
export const partnerPage = {
  "metaTitle": "Become A Partner - Doctor Fresh",
  "metaDescription": "Become A Partner - We assist you in setting goals and celebrates your success as our success with periodic reviews and provide feedback that will lead to the successful execution of further plans.",
  "heading": "Become A Partner",
  "tabs": [
    "Become A Dealer",
    "Become A Distributor",
    "Become A C&F/Master"
  ],
  "fields": [
    {
      "tag": "input",
      "type": "text",
      "name": "name",
      "placeholder": "First Name",
      "required": true
    },
    {
      "tag": "input",
      "type": "text",
      "name": "email",
      "placeholder": "Email",
      "required": true
    },
    {
      "tag": "input",
      "type": "number",
      "name": "mobile",
      "placeholder": "Phone Number",
      "required": true
    },
    {
      "tag": "input",
      "type": "type",
      "name": "business",
      "placeholder": "Business Name",
      "required": true
    },
    {
      "tag": "select",
      "type": "select",
      "name": "investment_capacity",
      "placeholder": "",
      "required": true,
      "options": [
        {
          "value": "50k - 1 Lakh",
          "label": "50k - 1 Lakh"
        },
        {
          "value": "1 Lakh - 2.5 Lakh",
          "label": "1 Lakh - 2.5 Lakh"
        },
        {
          "value": "2.5 Lakh - 5 Lakh",
          "label": "2.5 Lakh - 5 Lakh"
        }
      ]
    },
    {
      "tag": "select",
      "type": "select",
      "name": "education",
      "placeholder": "",
      "required": true,
      "options": [
        {
          "value": "10th",
          "label": "10th"
        },
        {
          "value": "12th",
          "label": "12th"
        },
        {
          "value": "Graduate",
          "label": "Graduate"
        },
        {
          "value": "Post Graduate",
          "label": "Post Graduate"
        }
      ]
    },
    {
      "tag": "input",
      "type": "text",
      "name": "state",
      "placeholder": "State Name",
      "required": true
    },
    {
      "tag": "input",
      "type": "text",
      "name": "city",
      "placeholder": "City Name",
      "required": true
    },
    {
      "tag": "textarea",
      "type": "textarea",
      "name": "address",
      "placeholder": "address",
      "required": true
    }
  ]
};
export const demoForm = {
  "title": "Book Water Purifier Demo",
  "fields": [
    {
      "tag": "input",
      "type": "text",
      "name": "name",
      "placeholder": "Name",
      "required": false
    },
    {
      "tag": "input",
      "type": "email",
      "name": "email",
      "placeholder": "Email",
      "required": false
    },
    {
      "tag": "input",
      "type": "number",
      "name": "number",
      "placeholder": "Your 10 Digit Number",
      "required": true
    },
    {
      "tag": "textarea",
      "type": "textarea",
      "name": "message",
      "placeholder": "Explain Requirement*",
      "required": false
    },
    {
      "tag": "input",
      "type": "checkbox",
      "name": "terms",
      "placeholder": "",
      "required": false,
      "value": ""
    },
    {
      "tag": "input",
      "type": "number",
      "name": "otp",
      "placeholder": "Enter OTP",
      "required": false
    },
    {
      "tag": "input",
      "type": "text",
      "name": "mobile",
      "placeholder": "10 Digit Mobile Number",
      "required": false
    },
    {
      "tag": "select",
      "type": "select",
      "name": "lead_type",
      "placeholder": "",
      "required": false,
      "options": [
        {
          "value": "",
          "label": "Select Category"
        }
      ]
    },
    {
      "tag": "input",
      "type": "text",
      "name": "c_pincode",
      "placeholder": "Enter Pin Code",
      "required": false
    },
    {
      "tag": "select",
      "type": "select",
      "name": "state",
      "placeholder": "",
      "required": false,
      "options": [
        {
          "value": "",
          "label": "Select State"
        }
      ]
    },
    {
      "tag": "select",
      "type": "select",
      "name": "city",
      "placeholder": "",
      "required": false,
      "options": [
        {
          "value": "",
          "label": "Select City"
        }
      ]
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "complain_type",
      "placeholder": "",
      "required": false,
      "value": "2"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "complain_type",
      "placeholder": "",
      "required": false,
      "value": "1"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "serv_type",
      "placeholder": "",
      "required": false,
      "value": "2"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "serv_type",
      "placeholder": "",
      "required": false,
      "value": "1"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "serv_type",
      "placeholder": "",
      "required": false,
      "value": "3"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "new_type",
      "placeholder": "",
      "required": false,
      "value": "product"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "new_type",
      "placeholder": "",
      "required": false,
      "value": "spare_parts"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "domcom",
      "placeholder": "",
      "required": false,
      "value": "1"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "domcom",
      "placeholder": "",
      "required": false,
      "value": "2"
    },
    {
      "tag": "input",
      "type": "text",
      "name": "house_no",
      "placeholder": "House No./ Bulding No.",
      "required": false
    },
    {
      "tag": "input",
      "type": "text",
      "name": "area",
      "placeholder": "Road Name/ Area.",
      "required": false
    },
    {
      "tag": "input",
      "type": "text",
      "name": "near_by",
      "placeholder": "Near by famous Place/Shope/School, etc...",
      "required": false
    },
    {
      "tag": "input",
      "type": "date",
      "name": "meeting_date",
      "placeholder": "Date",
      "required": false
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "time_slot",
      "placeholder": "",
      "required": false,
      "value": "Morning"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "time_slot",
      "placeholder": "",
      "required": false,
      "value": "Afternoon"
    },
    {
      "tag": "input",
      "type": "radio",
      "name": "time_slot",
      "placeholder": "",
      "required": false,
      "value": "Evening"
    }
  ]
};
export const stores = [
  {
    "city": "Gurugram",
    "address": "Unit No. 832, 9th Floor, JMD Megapolis, Badshahpur Sohna Road Highway, Sector 48, Aquaguard / Kent, Gurugram, Haryana 122018",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Delhi",
    "address": "54 Anand Lok, Sadiq Nagar, New Delhi, Delhi 110049",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Delhi",
    "address": "B 20, Block B, Ashoka Niketan, Anand Vihar, New Delhi, Delhi 110092",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Gurgaon",
    "address": "SCO F84, Sector-22, Plam Vihar Road, Gurgaon, Haryana 122015",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Gurgaon",
    "address": "A-1/270, Sushant Lok 2, Sector 55, Gurgaon, Haryana 122003",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Hyderabad",
    "address": "1-9-281/7/A Vidya Nagar, Ramnagar Gundu, Hyderabad, Telangana 500020",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Hyderabad",
    "address": "402, P & T Colony, Ashok Nagar, Himayatnagar, Hyderabad, Telangana 500020",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Mumbai",
    "address": "132/1344, Sector 19C, Byculla East, Mumbai, Maharashtra 400027",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Noida",
    "address": "184, Sector 83, B Block, A Block, Sector 83, Noida, Uttar Pradesh 201305",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Faridabad",
    "address": "67, Railway Rd, Railway Colony, New Industrial Town, Faridabad, Haryana 121001",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  },
  {
    "city": "Pune",
    "address": "155/4, Khadki Bazar, Khadki, Pune, Maharashtra 411003",
    "hours": "09:00AM - 06:00PM, Monday to Sunday"
  }
];
export const careers = {
  "title": "Opportunities",
  "intro": "We have some incredible openings for hopeful people who believe that they have the potential and aptitudes that can be joined to developing and changing over thoughts into the real world."
};
