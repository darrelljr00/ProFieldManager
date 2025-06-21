import { db } from "./db";
import { formTemplates } from "@shared/schema";

export async function seedFormTemplates() {
  console.log('Seeding form templates...');

  const templates = [
    {
      name: "Contact Form",
      description: "Basic contact form with name, email, and message fields",
      category: "contact",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "name",
            type: "text",
            label: "Full Name",
            placeholder: "Enter your full name",
            required: true
          },
          {
            id: "email", 
            type: "email",
            label: "Email Address",
            placeholder: "Enter your email address",
            required: true
          },
          {
            id: "phone",
            type: "phone", 
            label: "Phone Number",
            placeholder: "Enter your phone number",
            required: false
          },
          {
            id: "subject",
            type: "text",
            label: "Subject",
            placeholder: "What is this regarding?",
            required: true
          },
          {
            id: "message",
            type: "textarea",
            label: "Message",
            placeholder: "Tell us how we can help you...",
            required: true
          }
        ],
        settings: {
          submitButtonText: "Send Message",
          successMessage: "Thank you for contacting us! We'll get back to you soon.",
          allowAnonymous: true,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Customer Feedback Survey",
      description: "Collect customer feedback with rating scales and comments",
      category: "survey",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "customer_name",
            type: "text",
            label: "Your Name (Optional)",
            placeholder: "Enter your name",
            required: false
          },
          {
            id: "service_rating",
            type: "radio",
            label: "How would you rate our service?",
            required: true,
            options: ["Excellent", "Good", "Average", "Poor", "Very Poor"]
          },
          {
            id: "recommend",
            type: "radio",
            label: "Would you recommend us to others?",
            required: true,
            options: ["Definitely", "Probably", "Maybe", "Probably Not", "Definitely Not"]
          },
          {
            id: "improvements",
            type: "checkbox",
            label: "What areas could we improve? (Select all that apply)",
            required: false,
            options: ["Response Time", "Quality of Work", "Communication", "Pricing", "Professionalism", "Other"]
          },
          {
            id: "comments",
            type: "textarea",
            label: "Additional Comments",
            placeholder: "Please share any additional feedback...",
            required: false
          }
        ],
        settings: {
          submitButtonText: "Submit Feedback",
          successMessage: "Thank you for your valuable feedback!",
          allowAnonymous: true,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Job Application Form",
      description: "Comprehensive job application form with personal and professional details",
      category: "application",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "first_name",
            type: "text",
            label: "First Name",
            placeholder: "Enter your first name",
            required: true
          },
          {
            id: "last_name", 
            type: "text",
            label: "Last Name",
            placeholder: "Enter your last name",
            required: true
          },
          {
            id: "email",
            type: "email",
            label: "Email Address",
            placeholder: "Enter your email address", 
            required: true
          },
          {
            id: "phone",
            type: "phone",
            label: "Phone Number",
            placeholder: "Enter your phone number",
            required: true
          },
          {
            id: "position",
            type: "select",
            label: "Position Applying For",
            required: true,
            options: ["Field Technician", "Project Manager", "Sales Representative", "Administrative Assistant", "Operations Manager"]
          },
          {
            id: "experience",
            type: "radio",
            label: "Years of Relevant Experience",
            required: true,
            options: ["0-1 years", "2-5 years", "6-10 years", "10+ years"]
          },
          {
            id: "availability",
            type: "date",
            label: "Available Start Date",
            required: true
          },
          {
            id: "skills",
            type: "checkbox",
            label: "Relevant Skills (Select all that apply)",
            required: false,
            options: ["Customer Service", "Project Management", "Technical Skills", "Sales", "Leadership", "Problem Solving"]
          },
          {
            id: "cover_letter",
            type: "textarea",
            label: "Cover Letter / Why are you interested in this position?",
            placeholder: "Tell us why you'd be a great fit for this role...",
            required: true
          }
        ],
        settings: {
          submitButtonText: "Submit Application",
          successMessage: "Thank you for your application! We'll review it and get back to you soon.",
          allowAnonymous: true,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Service Request Form",
      description: "Form for customers to request services with project details",
      category: "service",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "customer_name",
            type: "text",
            label: "Customer Name",
            placeholder: "Enter your full name",
            required: true
          },
          {
            id: "customer_email",
            type: "email",
            label: "Email Address", 
            placeholder: "Enter your email address",
            required: true
          },
          {
            id: "customer_phone",
            type: "phone",
            label: "Phone Number",
            placeholder: "Enter your phone number",
            required: true
          },
          {
            id: "service_address",
            type: "textarea",
            label: "Service Address",
            placeholder: "Enter the full address where service is needed",
            required: true
          },
          {
            id: "service_type",
            type: "select",
            label: "Type of Service Needed",
            required: true,
            options: ["Installation", "Repair", "Maintenance", "Consultation", "Emergency Service", "Other"]
          },
          {
            id: "urgency",
            type: "radio",
            label: "Urgency Level",
            required: true,
            options: ["Emergency (Same Day)", "Urgent (Within 2-3 days)", "Standard (Within 1 week)", "Flexible (When Available)"]
          },
          {
            id: "preferred_date",
            type: "date",
            label: "Preferred Service Date",
            required: false
          },
          {
            id: "service_description",
            type: "textarea",
            label: "Detailed Description of Service Needed",
            placeholder: "Please provide as much detail as possible about what you need...",
            required: true
          },
          {
            id: "budget_range",
            type: "select",
            label: "Estimated Budget Range",
            required: false,
            options: ["Under $500", "$500 - $1,000", "$1,000 - $2,500", "$2,500 - $5,000", "Over $5,000", "Not Sure"]
          }
        ],
        settings: {
          submitButtonText: "Submit Service Request",
          successMessage: "Thank you for your service request! We'll contact you within 24 hours to discuss your needs.",
          allowAnonymous: true,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Event Registration",
      description: "Registration form for events, workshops, or training sessions",
      category: "registration",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "participant_name",
            type: "text",
            label: "Full Name",
            placeholder: "Enter your full name",
            required: true
          },
          {
            id: "participant_email",
            type: "email",
            label: "Email Address",
            placeholder: "Enter your email address",
            required: true
          },
          {
            id: "participant_phone",
            type: "phone",
            label: "Phone Number",
            placeholder: "Enter your phone number",
            required: true
          },
          {
            id: "company_name",
            type: "text",
            label: "Company/Organization",
            placeholder: "Enter your company name",
            required: false
          },
          {
            id: "event_session",
            type: "radio",
            label: "Which session would you like to attend?",
            required: true,
            options: ["Morning Session (9:00 AM - 12:00 PM)", "Afternoon Session (1:00 PM - 4:00 PM)", "Full Day (9:00 AM - 4:00 PM)"]
          },
          {
            id: "dietary_restrictions",
            type: "checkbox",
            label: "Dietary Restrictions (Select all that apply)",
            required: false,
            options: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut Allergies", "Other"]
          },
          {
            id: "experience_level",
            type: "radio",
            label: "Your Experience Level",
            required: true,
            options: ["Beginner", "Intermediate", "Advanced", "Expert"]
          },
          {
            id: "special_requirements",
            type: "textarea",
            label: "Special Requirements or Comments",
            placeholder: "Any special accommodations or questions?",
            required: false
          }
        ],
        settings: {
          submitButtonText: "Register for Event",
          successMessage: "Registration successful! You'll receive a confirmation email with event details.",
          allowAnonymous: true,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    }
  ];

  for (const template of templates) {
    try {
      await db.insert(formTemplates).values(template);
      console.log(`Created template: ${template.name}`);
    } catch (error) {
      console.log(`Template ${template.name} may already exist, skipping...`);
    }
  }

  console.log('Form templates seeding completed!');
}