#!/usr/bin/env node

// Script to import test data with proper MongoDB format
const { MongoClient } = require('mongodb');

const testGigs = [
  {
    gigId: "london-coldplay-2025-08-10-o2-arena",
    source: "songkick",
    sourceId: "12345",
    title: "Coldplay - Music of the Spheres Tour",
    artists: ["Coldplay"],
    tags: ["pop", "rock"],
    dateStart: new Date("2025-08-10T19:30:00Z"),
    dateEnd: new Date("2025-08-10T23:00:00Z"),
    timezone: "Europe/London",
    venue: {
      name: "The O2 Arena",
      address: "Peninsula Square",
      city: "London",
      country: "UK",
      lat: 51.5033,
      lng: 0.0029
    },
    price: {
      min: 85,
      max: 250,
      currency: "GBP"
    },
    ticketUrls: [
      "https://www.ticketmaster.co.uk/coldplay-london"
    ],
    eventUrl: "https://www.songkick.com/concerts/12345",
    imageUrl: "https://images.sk-static.com/images/media/img/col4/20240615-coldplay.jpg",
    description: "Experience Coldplay's spectacular live show with their biggest production yet",
    status: "on-sale",
    updatedAt: new Date("2025-08-09T10:00:00Z"),
    createdAt: new Date("2025-08-09T10:00:00Z")
  },
  {
    gigId: "london-ed-sheeran-2025-08-11-wembley",
    source: "bandsintown",
    sourceId: "67890",
    title: "Ed Sheeran - Mathematics Tour",
    artists: ["Ed Sheeran"],
    tags: ["pop", "singer-songwriter", "acoustic"],
    dateStart: new Date("2025-08-11T18:00:00Z"),
    dateEnd: new Date("2025-08-11T22:30:00Z"),
    timezone: "Europe/London",
    venue: {
      name: "Wembley Stadium",
      address: "Wembley",
      city: "London",
      country: "UK",
      lat: 51.5560,
      lng: -0.2795
    },
    price: {
      min: 65,
      max: 195,
      currency: "GBP"
    },
    ticketUrls: [
      "https://www.axs.com/uk/events/ed-sheeran-wembley"
    ],
    eventUrl: "https://www.bandsintown.com/e/67890",
    imageUrl: "https://s1.ticketm.net/dam/a/829/ed-sheeran-tour.jpg",
    description: "Ed Sheeran returns to Wembley Stadium for an unforgettable night",
    status: "on-sale",
    updatedAt: new Date("2025-08-09T11:00:00Z"),
    createdAt: new Date("2025-08-09T11:00:00Z")
  },
  {
    gigId: "manchester-arctic-monkeys-2025-08-15-ao-arena",
    source: "ticketmaster",
    sourceId: "54321",
    title: "Arctic Monkeys - UK Tour 2025",
    artists: ["Arctic Monkeys"],
    tags: ["indie", "rock", "alternative"],
    dateStart: new Date("2025-08-15T20:00:00Z"),
    dateEnd: new Date("2025-08-15T23:00:00Z"),
    timezone: "Europe/London",
    venue: {
      name: "AO Arena",
      address: "Victoria Station",
      city: "Manchester",
      country: "UK",
      lat: 53.4880,
      lng: -2.2446
    },
    price: {
      min: 55,
      max: 125,
      currency: "GBP"
    },
    ticketUrls: [
      "https://www.ticketmaster.co.uk/arctic-monkeys-manchester"
    ],
    eventUrl: "https://www.ticketmaster.co.uk/event/54321",
    imageUrl: "https://media.ticketmaster.co.uk/tm/arctic-monkeys-2025.jpg",
    description: "Arctic Monkeys bring their explosive live show to Manchester",
    status: "on-sale",
    updatedAt: new Date("2025-08-09T12:00:00Z"),
    createdAt: new Date("2025-08-09T12:00:00Z")
  },
  {
    gigId: "london-taylor-swift-2025-08-16-hyde-park",
    source: "livenation",
    sourceId: "98765",
    title: "Taylor Swift - Eras Tour",
    artists: ["Taylor Swift"],
    tags: ["pop", "country"],
    dateStart: new Date("2025-08-16T17:00:00Z"),
    dateEnd: new Date("2025-08-16T22:00:00Z"),
    timezone: "Europe/London",
    venue: {
      name: "Hyde Park",
      address: "Hyde Park",
      city: "London",
      country: "UK",
      lat: 51.5073,
      lng: -0.1657
    },
    price: {
      min: 95,
      max: 395,
      currency: "GBP"
    },
    ticketUrls: [
      "https://www.livenation.co.uk/taylor-swift-hyde-park"
    ],
    eventUrl: "https://www.livenation.co.uk/show/98765",
    imageUrl: "https://www.livenation.co.uk/images/taylor-swift-eras.jpg",
    description: "Taylor Swift's record-breaking Eras Tour comes to London's Hyde Park",
    status: "on-sale",
    updatedAt: new Date("2025-08-09T13:00:00Z"),
    createdAt: new Date("2025-08-09T13:00:00Z")
  },
  {
    gigId: "birmingham-oasis-2025-08-28-utilita-arena",
    source: "gigsandtours",
    sourceId: "11111",
    title: "Oasis - Reunion Tour 2025",
    artists: ["Oasis"],
    tags: ["rock", "britpop"],
    dateStart: new Date("2025-08-28T19:00:00Z"),
    dateEnd: new Date("2025-08-28T22:30:00Z"),
    timezone: "Europe/London",
    venue: {
      name: "Utilita Arena Birmingham",
      address: "King Edwards Road",
      city: "Birmingham",
      country: "UK",
      lat: 52.4797,
      lng: -1.9147
    },
    price: {
      min: 75,
      max: 195,
      currency: "GBP"
    },
    ticketUrls: [
      "https://www.gigsandtours.com/tour/oasis"
    ],
    eventUrl: "https://www.gigsandtours.com/event/11111",
    imageUrl: "https://www.gigsandtours.com/images/oasis-2025.jpg",
    description: "The legendary Oasis reunite for their first tour in 16 years",
    status: "on-sale",
    updatedAt: new Date("2025-08-09T14:00:00Z"),
    createdAt: new Date("2025-08-09T14:00:00Z")
  }
];

async function importTestData() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('gigateer');
    const collection = db.collection('gigs');
    
    // Drop existing collection
    await collection.drop().catch(() => {
      console.log('Collection does not exist yet');
    });
    
    // Insert test data
    const result = await collection.insertMany(testGigs);
    console.log(`Inserted ${result.insertedCount} gigs`);
    
    // Create indexes for better performance
    await collection.createIndex({ dateStart: 1 });
    await collection.createIndex({ 'venue.city': 1 });
    await collection.createIndex({ tags: 1 });
    await collection.createIndex({ gigId: 1 }, { unique: true });
    console.log('Created indexes');
    
    // Verify data
    const count = await collection.countDocuments();
    console.log(`Total gigs in database: ${count}`);
    
    const todayGigs = await collection.countDocuments({
      dateStart: {
        $gte: new Date('2025-08-10T00:00:00Z'),
        $lt: new Date('2025-08-11T00:00:00Z')
      }
    });
    console.log(`Gigs for today (2025-08-10): ${todayGigs}`);
    
  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

importTestData();