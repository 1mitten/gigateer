import { MongoClient } from 'mongodb';

async function checkCroftData() {
  const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('gigateer');
    const collection = db.collection('gigs');
    
    // Get one Croft gig
    const croftGig = await collection.findOne({ source: 'bristol-the-croft' });
    
    if (croftGig) {
      console.log('Sample Croft gig:');
      console.log(JSON.stringify(croftGig, null, 2));
      
      // Check the date format
      console.log('\nDate fields:');
      console.log('dateStart type:', typeof croftGig.dateStart);
      console.log('dateStart value:', croftGig.dateStart);
      
      // Count total
      const count = await collection.countDocuments({ source: 'bristol-the-croft' });
      console.log('\nTotal Croft gigs:', count);
      
      // Check for future events
      const futureCount = await collection.countDocuments({ 
        source: 'bristol-the-croft',
        dateStart: { $gte: new Date() }
      });
      console.log('Future Croft gigs:', futureCount);
      
      // Check a few other sources for comparison
      const sources = await collection.distinct('source');
      console.log('\nAll sources:', sources);
      
      // Compare with Exchange
      const exchangeGig = await collection.findOne({ source: 'bristol-exchange' });
      if (exchangeGig) {
        console.log('\nSample Exchange gig for comparison:');
        console.log('Exchange dateStart:', exchangeGig.dateStart);
        console.log('Exchange venue:', exchangeGig.venue);
      }
    } else {
      console.log('No Croft gigs found');
    }
    
  } finally {
    await client.close();
  }
}

checkCroftData().catch(console.error);