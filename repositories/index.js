/**
 * Repository exports for easy importing
 */
export { BaseRepository } from './BaseRepository.js'
export { UserRepository } from './UserRepository.js'
export { ProductRepository } from './ProductRepository.js'
export { CartRepository } from './CartRepository.js'

// Import classes to create singleton instances
import { UserRepository } from './UserRepository.js'
import { ProductRepository } from './ProductRepository.js'
import { CartRepository } from './CartRepository.js'

// Create singleton instances for common use
export const userRepository = new UserRepository()
export const productRepository = new ProductRepository()
export const cartRepository = new CartRepository()