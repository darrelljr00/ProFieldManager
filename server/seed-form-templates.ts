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
    },
    {
      name: "Employee Onboarding",
      description: "New employee information gathering form with personal and work details",
      category: "hr",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "employee_id",
            type: "text",
            label: "Employee ID",
            placeholder: "Enter employee ID",
            required: true
          },
          {
            id: "first_name",
            type: "text",
            label: "First Name",
            placeholder: "Enter first name",
            required: true
          },
          {
            id: "last_name",
            type: "text",
            label: "Last Name",
            placeholder: "Enter last name",
            required: true
          },
          {
            id: "personal_email",
            type: "email",
            label: "Personal Email",
            placeholder: "Enter personal email address",
            required: true
          },
          {
            id: "phone_number",
            type: "phone",
            label: "Phone Number",
            placeholder: "Enter phone number",
            required: true
          },
          {
            id: "emergency_contact",
            type: "text",
            label: "Emergency Contact Name",
            placeholder: "Enter emergency contact name",
            required: true
          },
          {
            id: "emergency_phone",
            type: "phone",
            label: "Emergency Contact Phone",
            placeholder: "Enter emergency contact phone",
            required: true
          },
          {
            id: "start_date",
            type: "date",
            label: "Start Date",
            required: true
          },
          {
            id: "department",
            type: "select",
            label: "Department",
            required: true,
            options: ["Operations", "Sales", "Administration", "Technical", "Management", "Customer Service"]
          },
          {
            id: "position_title",
            type: "text",
            label: "Position Title",
            placeholder: "Enter job title",
            required: true
          },
          {
            id: "shirt_size",
            type: "radio",
            label: "Uniform Shirt Size",
            required: true,
            options: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
          },
          {
            id: "special_requirements",
            type: "textarea",
            label: "Special Accommodations or Requirements",
            placeholder: "List any special needs or accommodations",
            required: false
          }
        ],
        settings: {
          submitButtonText: "Complete Onboarding",
          successMessage: "Welcome to the team! Your onboarding information has been submitted successfully.",
          allowAnonymous: false,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Equipment Request",
      description: "Form for requesting tools, equipment, or supplies",
      category: "operations",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "requester_name",
            type: "text",
            label: "Requester Name",
            placeholder: "Enter your full name",
            required: true
          },
          {
            id: "department",
            type: "select",
            label: "Department",
            required: true,
            options: ["Field Operations", "Office", "Warehouse", "Sales", "Technical", "Management"]
          },
          {
            id: "equipment_type",
            type: "radio",
            label: "Equipment Category",
            required: true,
            options: ["Tools", "Safety Equipment", "Office Supplies", "Technology", "Vehicles", "Other"]
          },
          {
            id: "items_requested",
            type: "textarea",
            label: "Items Requested (list each item)",
            placeholder: "List each item with quantity needed",
            required: true
          },
          {
            id: "justification",
            type: "textarea",
            label: "Business Justification",
            placeholder: "Explain why this equipment is needed",
            required: true
          },
          {
            id: "urgency",
            type: "radio",
            label: "Priority Level",
            required: true,
            options: ["Immediate (Safety Critical)", "High (This Week)", "Medium (This Month)", "Low (When Available)"]
          },
          {
            id: "estimated_cost",
            type: "text",
            label: "Estimated Total Cost",
            placeholder: "Enter estimated cost if known",
            required: false
          },
          {
            id: "preferred_vendor",
            type: "text",
            label: "Preferred Vendor (if any)",
            placeholder: "Enter vendor name if you have a preference",
            required: false
          },
          {
            id: "date_needed",
            type: "date",
            label: "Date Needed By",
            required: true
          }
        ],
        settings: {
          submitButtonText: "Submit Request",
          successMessage: "Your equipment request has been submitted and will be reviewed by management.",
          allowAnonymous: false,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Quality Assurance Checklist",
      description: "Quality control inspection form for completed work",
      category: "quality",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "inspector_name",
            type: "text",
            label: "Inspector Name",
            placeholder: "Enter inspector name",
            required: true
          },
          {
            id: "project_number",
            type: "text",
            label: "Project Number",
            placeholder: "Enter project number",
            required: true
          },
          {
            id: "inspection_date",
            type: "date",
            label: "Inspection Date",
            required: true
          },
          {
            id: "work_completed",
            type: "radio",
            label: "Work Completed According to Specifications",
            required: true,
            options: ["Yes", "No", "Partial"]
          },
          {
            id: "safety_compliance",
            type: "radio",
            label: "Safety Standards Met",
            required: true,
            options: ["Fully Compliant", "Minor Issues", "Major Issues", "Non-Compliant"]
          },
          {
            id: "material_quality",
            type: "radio",
            label: "Material Quality Assessment",
            required: true,
            options: ["Excellent", "Good", "Acceptable", "Poor", "Unacceptable"]
          },
          {
            id: "workmanship",
            type: "radio",
            label: "Workmanship Quality",
            required: true,
            options: ["Excellent", "Good", "Acceptable", "Poor", "Unacceptable"]
          },
          {
            id: "cleanup_status",
            type: "radio",
            label: "Site Cleanup Status",
            required: true,
            options: ["Complete", "Satisfactory", "Needs Improvement", "Incomplete"]
          },
          {
            id: "issues_found",
            type: "checkbox",
            label: "Issues Found (Select all that apply)",
            required: false,
            options: ["Safety Violations", "Material Defects", "Incomplete Work", "Poor Workmanship", "Code Violations", "Documentation Missing"]
          },
          {
            id: "corrective_actions",
            type: "textarea",
            label: "Required Corrective Actions",
            placeholder: "Detail any corrective actions needed",
            required: false
          },
          {
            id: "overall_rating",
            type: "radio",
            label: "Overall Project Rating",
            required: true,
            options: ["Excellent", "Good", "Satisfactory", "Needs Improvement", "Unsatisfactory"]
          },
          {
            id: "inspector_notes",
            type: "textarea",
            label: "Additional Inspector Notes",
            placeholder: "Any additional observations or comments",
            required: false
          }
        ],
        settings: {
          submitButtonText: "Submit QA Report",
          successMessage: "Quality assurance report submitted successfully.",
          allowAnonymous: false,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Customer Complaint Form",
      description: "Form for documenting and tracking customer complaints",
      category: "customer_service",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "customer_name",
            type: "text",
            label: "Customer Name",
            placeholder: "Enter customer full name",
            required: true
          },
          {
            id: "customer_email",
            type: "email",
            label: "Customer Email",
            placeholder: "Enter customer email address",
            required: true
          },
          {
            id: "customer_phone",
            type: "phone",
            label: "Customer Phone",
            placeholder: "Enter customer phone number",
            required: true
          },
          {
            id: "project_reference",
            type: "text",
            label: "Project/Invoice Reference",
            placeholder: "Enter project or invoice number",
            required: false
          },
          {
            id: "complaint_category",
            type: "select",
            label: "Complaint Category",
            required: true,
            options: ["Quality of Work", "Timeliness", "Communication", "Billing", "Staff Behavior", "Safety Concerns", "Other"]
          },
          {
            id: "incident_date",
            type: "date",
            label: "Date of Incident",
            required: true
          },
          {
            id: "complaint_description",
            type: "textarea",
            label: "Detailed Description of Complaint",
            placeholder: "Please provide as much detail as possible about your concerns",
            required: true
          },
          {
            id: "desired_resolution",
            type: "textarea",
            label: "Desired Resolution",
            placeholder: "How would you like us to resolve this issue?",
            required: true
          },
          {
            id: "priority_level",
            type: "radio",
            label: "Priority Level",
            required: true,
            options: ["Low", "Medium", "High", "Critical"]
          },
          {
            id: "previous_contact",
            type: "radio",
            label: "Have you contacted us about this issue before?",
            required: true,
            options: ["Yes", "No"]
          },
          {
            id: "staff_involved",
            type: "text",
            label: "Staff Member(s) Involved (if known)",
            placeholder: "Enter names if known",
            required: false
          }
        ],
        settings: {
          submitButtonText: "Submit Complaint",
          successMessage: "Thank you for your feedback. We take all complaints seriously and will investigate this matter promptly.",
          allowAnonymous: true,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Safety Incident Report",
      description: "Report form for workplace safety incidents and near misses",
      category: "safety",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "reporter_name",
            type: "text",
            label: "Reporter Name",
            placeholder: "Enter your full name",
            required: true
          },
          {
            id: "incident_date",
            type: "date",
            label: "Date of Incident",
            required: true
          },
          {
            id: "incident_time",
            type: "text",
            label: "Time of Incident",
            placeholder: "Enter time (e.g., 2:30 PM)",
            required: true
          },
          {
            id: "incident_location",
            type: "text",
            label: "Location of Incident",
            placeholder: "Enter specific location or address",
            required: true
          },
          {
            id: "incident_type",
            type: "radio",
            label: "Type of Incident",
            required: true,
            options: ["Injury", "Near Miss", "Property Damage", "Equipment Failure", "Environmental", "Security"]
          },
          {
            id: "severity_level",
            type: "radio",
            label: "Severity Level",
            required: true,
            options: ["Minor", "Moderate", "Serious", "Critical", "Fatal"]
          },
          {
            id: "people_involved",
            type: "textarea",
            label: "People Involved",
            placeholder: "List all people involved in the incident",
            required: true
          },
          {
            id: "incident_description",
            type: "textarea",
            label: "Detailed Description of Incident",
            placeholder: "Describe exactly what happened",
            required: true
          },
          {
            id: "contributing_factors",
            type: "checkbox",
            label: "Contributing Factors (Select all that apply)",
            required: false,
            options: ["Equipment Malfunction", "Human Error", "Environmental Conditions", "Inadequate Training", "Poor Communication", "Time Pressure", "Other"]
          },
          {
            id: "immediate_actions",
            type: "textarea",
            label: "Immediate Actions Taken",
            placeholder: "Describe what was done immediately after the incident",
            required: true
          },
          {
            id: "medical_attention",
            type: "radio",
            label: "Was Medical Attention Required?",
            required: true,
            options: ["No", "First Aid Only", "Medical Professional", "Hospital", "Emergency Services"]
          },
          {
            id: "witnesses",
            type: "textarea",
            label: "Witnesses",
            placeholder: "List any witnesses with contact information",
            required: false
          }
        ],
        settings: {
          submitButtonText: "Submit Safety Report",
          successMessage: "Safety incident report submitted. This will be reviewed immediately by safety management.",
          allowAnonymous: false,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Time Off Request",
      description: "Employee request form for vacation, sick leave, and personal time",
      category: "hr",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "employee_name",
            type: "text",
            label: "Employee Name",
            placeholder: "Enter your full name",
            required: true
          },
          {
            id: "employee_id",
            type: "text",
            label: "Employee ID",
            placeholder: "Enter your employee ID",
            required: true
          },
          {
            id: "request_type",
            type: "radio",
            label: "Type of Time Off",
            required: true,
            options: ["Vacation", "Sick Leave", "Personal Day", "Bereavement", "Medical Leave", "Family Leave", "Other"]
          },
          {
            id: "start_date",
            type: "date",
            label: "Start Date",
            required: true
          },
          {
            id: "end_date",
            type: "date",
            label: "End Date",
            required: true
          },
          {
            id: "total_days",
            type: "number",
            label: "Total Days Requested",
            placeholder: "Enter number of days",
            required: true
          },
          {
            id: "reason",
            type: "textarea",
            label: "Reason for Request",
            placeholder: "Briefly explain the reason for time off",
            required: true
          },
          {
            id: "coverage_arranged",
            type: "radio",
            label: "Have you arranged coverage for your responsibilities?",
            required: true,
            options: ["Yes", "No", "Not Applicable"]
          },
          {
            id: "coverage_details",
            type: "textarea",
            label: "Coverage Arrangements",
            placeholder: "Explain how your work will be covered",
            required: false
          },
          {
            id: "emergency_contact",
            type: "text",
            label: "Emergency Contact During Leave",
            placeholder: "Name and phone number",
            required: false
          },
          {
            id: "advance_notice",
            type: "radio",
            label: "Is this request being made with adequate advance notice?",
            required: true,
            options: ["Yes", "No (Emergency)", "Partially"]
          }
        ],
        settings: {
          submitButtonText: "Submit Request",
          successMessage: "Your time off request has been submitted and will be reviewed by your supervisor.",
          allowAnonymous: false,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Vendor Information Form",
      description: "New vendor registration and information collection form",
      category: "procurement",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "company_name",
            type: "text",
            label: "Company Name",
            placeholder: "Enter company legal name",
            required: true
          },
          {
            id: "contact_person",
            type: "text",
            label: "Primary Contact Person",
            placeholder: "Enter contact person's full name",
            required: true
          },
          {
            id: "contact_title",
            type: "text",
            label: "Contact Title",
            placeholder: "Enter job title",
            required: true
          },
          {
            id: "business_email",
            type: "email",
            label: "Business Email",
            placeholder: "Enter business email address",
            required: true
          },
          {
            id: "business_phone",
            type: "phone",
            label: "Business Phone",
            placeholder: "Enter business phone number",
            required: true
          },
          {
            id: "business_address",
            type: "textarea",
            label: "Business Address",
            placeholder: "Enter complete business address",
            required: true
          },
          {
            id: "tax_id",
            type: "text",
            label: "Tax ID / EIN",
            placeholder: "Enter tax identification number",
            required: true
          },
          {
            id: "services_provided",
            type: "checkbox",
            label: "Services/Products Provided (Select all that apply)",
            required: true,
            options: ["Materials/Supplies", "Equipment", "Subcontracting", "Professional Services", "Maintenance", "Transportation", "Other"]
          },
          {
            id: "service_description",
            type: "textarea",
            label: "Detailed Service Description",
            placeholder: "Describe your services or products in detail",
            required: true
          },
          {
            id: "years_in_business",
            type: "radio",
            label: "Years in Business",
            required: true,
            options: ["Less than 1 year", "1-3 years", "4-10 years", "11-20 years", "Over 20 years"]
          },
          {
            id: "insurance_coverage",
            type: "radio",
            label: "Do you carry liability insurance?",
            required: true,
            options: ["Yes", "No"]
          },
          {
            id: "references",
            type: "textarea",
            label: "Business References",
            placeholder: "Provide 3 business references with contact information",
            required: true
          },
          {
            id: "payment_terms",
            type: "text",
            label: "Preferred Payment Terms",
            placeholder: "e.g., Net 30, COD, etc.",
            required: true
          }
        ],
        settings: {
          submitButtonText: "Submit Vendor Application",
          successMessage: "Thank you for your vendor application. We will review your information and contact you within 5 business days.",
          allowAnonymous: true,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Project Completion Survey",
      description: "Post-project evaluation form for customer satisfaction and feedback",
      category: "survey",
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
            id: "project_number",
            type: "text",
            label: "Project Number",
            placeholder: "Enter project reference number",
            required: true
          },
          {
            id: "project_completion_date",
            type: "date",
            label: "Project Completion Date",
            required: true
          },
          {
            id: "overall_satisfaction",
            type: "radio",
            label: "Overall Satisfaction with Project",
            required: true,
            options: ["Extremely Satisfied", "Very Satisfied", "Satisfied", "Somewhat Satisfied", "Dissatisfied"]
          },
          {
            id: "quality_rating",
            type: "radio",
            label: "Quality of Work",
            required: true,
            options: ["Excellent", "Very Good", "Good", "Fair", "Poor"]
          },
          {
            id: "timeliness_rating",
            type: "radio",
            label: "Project Timeliness",
            required: true,
            options: ["Completed Early", "On Time", "Slightly Late", "Significantly Late", "Very Late"]
          },
          {
            id: "communication_rating",
            type: "radio",
            label: "Communication During Project",
            required: true,
            options: ["Excellent", "Very Good", "Good", "Fair", "Poor"]
          },
          {
            id: "staff_professionalism",
            type: "radio",
            label: "Staff Professionalism",
            required: true,
            options: ["Excellent", "Very Good", "Good", "Fair", "Poor"]
          },
          {
            id: "value_for_money",
            type: "radio",
            label: "Value for Money",
            required: true,
            options: ["Excellent Value", "Good Value", "Fair Value", "Poor Value", "Very Poor Value"]
          },
          {
            id: "recommend_likelihood",
            type: "radio",
            label: "How likely are you to recommend us to others?",
            required: true,
            options: ["Extremely Likely", "Very Likely", "Likely", "Unlikely", "Very Unlikely"]
          },
          {
            id: "future_business",
            type: "radio",
            label: "Would you use our services again?",
            required: true,
            options: ["Definitely", "Probably", "Maybe", "Probably Not", "Definitely Not"]
          },
          {
            id: "best_aspects",
            type: "textarea",
            label: "What did we do best?",
            placeholder: "Tell us what you liked most about our service",
            required: false
          },
          {
            id: "improvement_suggestions",
            type: "textarea",
            label: "How can we improve?",
            placeholder: "Any suggestions for improvement?",
            required: false
          },
          {
            id: "additional_comments",
            type: "textarea",
            label: "Additional Comments",
            placeholder: "Any other feedback you'd like to share",
            required: false
          }
        ],
        settings: {
          submitButtonText: "Submit Survey",
          successMessage: "Thank you for your valuable feedback! Your input helps us improve our services.",
          allowAnonymous: true,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Lead Qualification Form",
      description: "Comprehensive form to qualify potential sales leads and gather project requirements",
      category: "sales",
      isSystem: true,
      templateData: {
        fields: [
          {
            id: "lead_name",
            type: "text",
            label: "Contact Name",
            placeholder: "Enter full name",
            required: true
          },
          {
            id: "company_name",
            type: "text",
            label: "Company Name",
            placeholder: "Enter company name",
            required: false
          },
          {
            id: "lead_email",
            type: "email",
            label: "Email Address",
            placeholder: "Enter email address",
            required: true
          },
          {
            id: "lead_phone",
            type: "phone",
            label: "Phone Number",
            placeholder: "Enter phone number",
            required: true
          },
          {
            id: "project_address",
            type: "textarea",
            label: "Project Address",
            placeholder: "Enter the address where work would be performed",
            required: true
          },
          {
            id: "project_type",
            type: "select",
            label: "Type of Project",
            required: true,
            options: ["Residential", "Commercial", "Industrial", "Municipal", "Emergency", "Other"]
          },
          {
            id: "services_needed",
            type: "checkbox",
            label: "Services Needed (Select all that apply)",
            required: true,
            options: ["Installation", "Repair", "Maintenance", "Inspection", "Consultation", "Emergency Service", "Other"]
          },
          {
            id: "project_timeline",
            type: "radio",
            label: "Desired Timeline",
            required: true,
            options: ["ASAP", "Within 1 month", "1-3 months", "3-6 months", "6+ months", "Flexible"]
          },
          {
            id: "budget_range",
            type: "select",
            label: "Budget Range",
            required: true,
            options: ["Under $1,000", "$1,000 - $5,000", "$5,000 - $15,000", "$15,000 - $50,000", "Over $50,000", "Need Estimate"]
          },
          {
            id: "decision_maker",
            type: "radio",
            label: "Are you the primary decision maker?",
            required: true,
            options: ["Yes", "No", "One of several"]
          },
          {
            id: "decision_timeline",
            type: "radio",
            label: "When do you plan to make a decision?",
            required: true,
            options: ["Within 1 week", "Within 1 month", "1-3 months", "3+ months", "Just researching"]
          },
          {
            id: "current_situation",
            type: "textarea",
            label: "Current Situation/Problem",
            placeholder: "Describe your current situation and what you need help with",
            required: true
          },
          {
            id: "lead_source",
            type: "select",
            label: "How did you hear about us?",
            required: false,
            options: ["Google Search", "Referral", "Social Media", "Advertisement", "Previous Customer", "Trade Show", "Other"]
          },
          {
            id: "additional_info",
            type: "textarea",
            label: "Additional Information",
            placeholder: "Any other details that would help us prepare for your project",
            required: false
          }
        ],
        settings: {
          submitButtonText: "Submit Lead Information",
          successMessage: "Thank you for your interest! A sales representative will contact you within 24 hours to discuss your project.",
          allowAnonymous: true,
          notifications: {
            email: "",
            enableNotifications: true
          }
        }
      }
    },
    {
      name: "Maintenance Schedule Request",
      description: "Form for customers to request recurring maintenance services",
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
            id: "property_address",
            type: "textarea",
            label: "Property Address",
            placeholder: "Enter the complete address for maintenance services",
            required: true
          },
          {
            id: "property_type",
            type: "radio",
            label: "Property Type",
            required: true,
            options: ["Residential Home", "Apartment/Condo", "Commercial Building", "Industrial Facility", "Other"]
          },
          {
            id: "maintenance_type",
            type: "checkbox",
            label: "Types of Maintenance Needed (Select all that apply)",
            required: true,
            options: ["HVAC Systems", "Plumbing", "Electrical", "Landscaping", "Cleaning", "Security Systems", "General Repairs", "Other"]
          },
          {
            id: "maintenance_frequency",
            type: "radio",
            label: "Preferred Maintenance Frequency",
            required: true,
            options: ["Weekly", "Bi-weekly", "Monthly", "Quarterly", "Semi-annually", "Annually", "As Needed"]
          },
          {
            id: "preferred_day",
            type: "select",
            label: "Preferred Day of Week",
            required: false,
            options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "No Preference"]
          },
          {
            id: "preferred_time",
            type: "radio",
            label: "Preferred Time of Day",
            required: false,
            options: ["Morning (8AM-12PM)", "Afternoon (12PM-5PM)", "Evening (5PM-8PM)", "No Preference"]
          },
          {
            id: "start_date",
            type: "date",
            label: "Preferred Start Date",
            required: true
          },
          {
            id: "special_instructions",
            type: "textarea",
            label: "Special Instructions or Requirements",
            placeholder: "Any special requirements, access instructions, or concerns",
            required: false
          },
          {
            id: "emergency_access",
            type: "radio",
            label: "Do you want emergency service access?",
            required: true,
            options: ["Yes, with 24/7 availability", "Yes, during business hours only", "No, scheduled only"]
          },
          {
            id: "contract_length",
            type: "radio",
            label: "Preferred Contract Length",
            required: true,
            options: ["6 months", "1 year", "2 years", "Month-to-month", "Discuss options"]
          }
        ],
        settings: {
          submitButtonText: "Request Maintenance Schedule",
          successMessage: "Thank you for your maintenance request! We'll contact you within 24 hours to discuss your maintenance plan and schedule.",
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