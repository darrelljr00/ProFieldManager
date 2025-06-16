import { db } from './db.js';
import { reviewRequests, googleMyBusinessSettings } from '../shared/schema.js';

export async function seedReviewData() {
  try {
    console.log('Seeding review management data...');

    // Create Google My Business settings for admin user
    await db.insert(googleMyBusinessSettings).values({
      locationId: 'ChIJ_SsKhKJQwokRr5P4ROlNv7I',
      locationName: 'Main Location',
      businessName: 'Elite Construction Services',
      placeId: 'ChIJ_SsKhKJQwokRr5P4ROlNv7I',
      reviewUrl: 'https://g.page/r/elite-construction/review',
      isActive: true
    }).onConflictDoNothing();

    // Create sample review requests with various statuses
    const sampleRequests = [
      {
        userId: 2,
        projectId: 5,
        customerId: 12,
        customerPhone: '+1234567890',
        customerName: 'John Smith',
        status: 'reviewed',
        sentAt: new Date('2024-06-10'),
        reviewedAt: new Date('2024-06-12'),
        googleReviewRating: 5,
        googleReviewText: 'Excellent work! Very professional and timely.',
        twilioMessageSid: 'SM1234567890abcdef'
      },
      {
        userId: 2,
        projectId: 6,
        customerId: 13,
        customerPhone: '+1234567891',
        customerName: 'Jane Doe',
        status: 'reviewed',
        sentAt: new Date('2024-06-08'),
        reviewedAt: new Date('2024-06-10'),
        googleReviewRating: 4,
        googleReviewText: 'Great service, would recommend!',
        twilioMessageSid: 'SM1234567890abcdef2'
      },
      {
        userId: 2,
        projectId: 7,
        customerId: 14,
        customerPhone: '+1234567892',
        customerName: 'Bob Johnson',
        status: 'sent',
        sentAt: new Date('2024-06-14'),
        twilioMessageSid: 'SM1234567890abcdef3'
      },
      {
        userId: 2,
        projectId: 8,
        customerId: 15,
        customerPhone: '+1234567893',
        customerName: 'Alice Brown',
        status: 'sent',
        sentAt: new Date('2024-06-13'),
        twilioMessageSid: 'SM1234567890abcdef4'
      },
      {
        userId: 2,
        projectId: 9,
        customerId: 16,
        customerPhone: '+1234567894',
        customerName: 'Charlie Wilson',
        status: 'reviewed',
        sentAt: new Date('2024-05-20'),
        reviewedAt: new Date('2024-05-22'),
        googleReviewRating: 5,
        googleReviewText: 'Outstanding quality and customer service!',
        twilioMessageSid: 'SM1234567890abcdef5'
      },
      {
        userId: 2,
        projectId: 10,
        customerId: 17,
        customerPhone: '+1234567895',
        customerName: 'Diana Davis',
        status: 'reviewed',
        sentAt: new Date('2024-05-15'),
        reviewedAt: new Date('2024-05-17'),
        googleReviewRating: 4,
        googleReviewText: 'Very satisfied with the work completed.',
        twilioMessageSid: 'SM1234567890abcdef6'
      },
      {
        userId: 2,
        projectId: 11,
        customerId: 18,
        customerPhone: '+1234567896',
        customerName: 'Frank Miller',
        status: 'expired',
        sentAt: new Date('2024-04-10'),
        errorMessage: 'No response after 30 days',
        twilioMessageSid: 'SM1234567890abcdef7'
      }
    ];

    for (const request of sampleRequests) {
      await db.insert(reviewRequests).values(request).onConflictDoNothing();
    }

    console.log('✅ Review management data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding review data:', error);
  }
}