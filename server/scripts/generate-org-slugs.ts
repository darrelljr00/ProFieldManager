/**
 * One-time script to generate slugs for organizations that don't have one
 * Run with: tsx server/scripts/generate-org-slugs.ts
 */
import { db } from '../db';
import { organizations } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { slugify, generateUniqueSlug } from '../utils/slugify';

async function generateSlugsForOrganizations() {
  console.log('🔄 Checking for organizations without slugs...');
  
  try {
    // Get all organizations
    const allOrgs = await db.select().from(organizations);
    
    const existingSlugs: string[] = [];
    const orgsNeedingSlugs: any[] = [];
    
    // Separate orgs with slugs from those without
    for (const org of allOrgs) {
      if (org.slug) {
        existingSlugs.push(org.slug);
      } else {
        orgsNeedingSlugs.push(org);
      }
    }
    
    if (orgsNeedingSlugs.length === 0) {
      console.log('✅ All organizations already have slugs!');
      return;
    }
    
    console.log(`📝 Generating slugs for ${orgsNeedingSlugs.length} organizations...`);
    
    // Generate and assign slugs
    for (const org of orgsNeedingSlugs) {
      const baseSlug = slugify(org.name);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
      
      await db.update(organizations)
        .set({ slug: uniqueSlug })
        .where(sql`${organizations.id} = ${org.id}`);
      
      existingSlugs.push(uniqueSlug);
      console.log(`  ✓ ${org.name} → ${uniqueSlug}`);
    }
    
    console.log('✅ All slugs generated successfully!');
  } catch (error) {
    console.error('❌ Error generating slugs:', error);
    throw error;
  }
}

// Run the function
generateSlugsForOrganizations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
