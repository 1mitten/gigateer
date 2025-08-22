#!/usr/bin/env node

/**
 * Script to clean up bristol-electric events from MongoDB
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const MONGODB_URL = process.env.MONGODB_CONNECTION_STRING;
const DATABASE_NAME = process.env.MONGODB_DATABASE_NAME || 'gigateer';

async function cleanup() {
  if (!MONGODB_URL) {
    console.error('❌ MONGODB_CONNECTION_STRING not found in environment');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URL);
  
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const gigsCollection = db.collection('gigs');
    
    // Count bristol-electric events
    const count = await gigsCollection.countDocuments({ source: 'bristol-electric' });
    console.log(`📊 Found ${count} bristol-electric events in database`);
    
    if (count === 0) {
      console.log('✅ No bristol-electric events to remove');
      return;
    }
    
    // Remove all bristol-electric events
    console.log('🗑️  Removing bristol-electric events...');
    const result = await gigsCollection.deleteMany({ source: 'bristol-electric' });
    
    console.log(`✅ Successfully removed ${result.deletedCount} bristol-electric events`);
    
    // Verify removal
    const remainingCount = await gigsCollection.countDocuments({ source: 'bristol-electric' });
    console.log(`📊 Remaining bristol-electric events: ${remainingCount}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

cleanup();