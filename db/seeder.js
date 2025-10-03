import { getDBConnection } from './db.js'
import bcrypt from 'bcryptjs'
import { logger } from '../middleware/errorHandler.js'

export class DatabaseSeeder {

  async seedProducts() {
    const db = await getDBConnection()

    try {
      // Check if products already exist
      const existingProducts = await db.get('SELECT COUNT(*) as count FROM products')
      if (existingProducts.count > 0) {
        logger.info('Products already seeded, skipping')
        return
      }

      const products = [
        {
          title: 'Selling Dogma',
          artist: 'The Clouds',
          price: 44.99,
          image: 'vinyl1.png',
          year: 2003,
          genre: 'rock',
          stock: 12,
          description: 'A powerful rock album that explores themes of rebellion and social commentary.'
        },
        {
          title: 'Echoes in Transit',
          artist: 'Silver Meadow',
          price: 38.59,
          image: 'vinyl2.png',
          year: 2012,
          genre: 'indie',
          stock: 12,
          description: 'Dreamy indie soundscapes that transport you to another world.'
        },
        {
          title: 'Midnight Parallels',
          artist: 'Neon Grove',
          price: 40.99,
          image: 'vinyl3.png',
          year: 2020,
          genre: 'ambient',
          stock: 12,
          description: 'Atmospheric ambient music perfect for late-night contemplation.'
        },
        {
          title: 'Paper Skies',
          artist: 'The Ivory Youth',
          price: 42.45,
          image: 'vinyl4.png',
          year: 2010,
          genre: 'rock',
          stock: 12,
          description: 'Melodic rock with introspective lyrics and soaring guitar solos.'
        },
        {
          title: 'Lost Cartography',
          artist: 'Atlas Hills',
          price: 39.99,
          image: 'vinyl5.png',
          year: 2007,
          genre: 'folk',
          stock: 12,
          description: 'Acoustic folk tales that map the human experience with beautiful storytelling.'
        },
        {
          title: 'Seaside Reflections',
          artist: 'Drifted Pines',
          price: 41.59,
          image: 'vinyl6.png',
          year: 2015,
          genre: 'ambient',
          stock: 12,
          description: 'Calming ambient sounds inspired by ocean waves and coastal landscapes.'
        },
        {
          title: 'Quiet Wars',
          artist: 'Northern Glow',
          price: 37.66,
          image: 'vinyl7.png',
          year: 2009,
          genre: 'indie',
          stock: 12,
          description: 'Subtle indie rock that battles internal struggles with gentle melodies.'
        },
        {
          title: 'Blossom and Rust',
          artist: 'Faded Echoes',
          price: 45.99,
          image: 'vinyl8.png',
          year: 2017,
          genre: 'indie',
          stock: 12,
          description: 'A beautiful juxtaposition of growth and decay in indie rock form.'
        },
        {
          title: 'Broken Glow',
          artist: 'Static Empire',
          price: 43.99,
          image: 'vinyl9.png',
          year: 2014,
          genre: 'punk',
          stock: 12,
          description: 'Raw punk energy with a message of hope breaking through darkness.'
        },
        {
          title: 'Dreams of Glass',
          artist: 'Wild Lanterns',
          price: 46.69,
          image: 'vinyl10.png',
          year: 2019,
          genre: 'indie',
          stock: 12,
          description: 'Fragile indie melodies that capture the delicate nature of dreams and aspirations.'
        }
      ]

      for (const product of products) {
        await db.run(
          'INSERT INTO products (title, artist, price, image, year, genre, stock, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [product.title, product.artist, product.price, product.image, product.year, product.genre, product.stock, product.description, new Date().toISOString(), new Date().toISOString()]
        )
      }

      logger.info(`Seeded ${products.length} products`)

    } finally {
      await db.close()
    }
  }

  async seedTestUser() {
    const db = await getDBConnection()

    try {
      // Check if test user already exists
      const existingUser = await db.get('SELECT id FROM users WHERE username = ?', ['testuser'])
      if (existingUser) {
        logger.info('Test user already exists, skipping')
        return existingUser.id
      }

      // Create test user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 12)
      const result = await db.run(
        'INSERT INTO users (name, email, username, password, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['Test User', 'test@spiralsounds.com', 'testuser', hashedPassword, true, new Date().toISOString()]
      )

      logger.info('Created test user: testuser / TestPassword123!')
      return result.lastID

    } finally {
      await db.close()
    }
  }

  async seedSampleReviews() {
    const db = await getDBConnection()

    try {
      // Check if reviews already exist
      const existingReviews = await db.get('SELECT COUNT(*) as count FROM reviews')
      if (existingReviews.count > 0) {
        logger.info('Reviews already seeded, skipping')
        return
      }

      // Get test user ID
      const testUser = await db.get('SELECT id FROM users WHERE username = ?', ['testuser'])
      if (!testUser) {
        logger.warn('No test user found, skipping review seeding')
        return
      }

      const reviews = [
        {
          product_id: 1,
          rating: 5,
          comment: 'Absolutely incredible album! The production quality is outstanding and the vinyl pressing is pristine. Every track is a masterpiece.'
        },
        {
          product_id: 2,
          rating: 4,
          comment: 'Beautiful indie soundscapes. Perfect for relaxing evenings. The vinyl sounds warm and rich.'
        },
        {
          product_id: 3,
          rating: 5,
          comment: 'This ambient album is a journey through sound. Perfect for meditation and creative work. Highly recommended!'
        }
      ]

      for (const review of reviews) {
        await db.run(
          'INSERT INTO reviews (user_id, product_id, rating, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [testUser.id, review.product_id, review.rating, review.comment, new Date().toISOString(), new Date().toISOString()]
        )
      }

      logger.info(`Seeded ${reviews.length} sample reviews`)

    } finally {
      await db.close()
    }
  }

  async seedAll() {
    logger.info('Starting database seeding...')
    try {
      await this.seedProducts()
      await this.seedTestUser()
      await this.seedSampleReviews()
      logger.info('Database seeding completed successfully!')
    } catch (error) {
      logger.error('Database seeding failed:', error)
      throw error
    }
  }
}

export const seeder = new DatabaseSeeder()