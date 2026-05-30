import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Types for order events
interface OrderItem {
  id: string
  mealId: string
  name: string
  quantity: number
  price: number
  notes?: string
}

interface Order {
  id: string
  orderNumber: number
  items: OrderItem[]
  total: number
  status: string
  tableNumber?: string
  customerName?: string
  createdAt: string
  updatedAt: string
}

interface OrderStatusUpdate {
  orderId: string
  status: string
  updatedAt: string
  updatedBy?: string
}

// Track connected clients per room
const roomClients = new Map<string, Set<string>>()

// Order number counter
let orderCounter = 0

/**
 * Get or create a client set for a room
 */
function getRoomClientSet(room: string): Set<string> {
  if (!roomClients.has(room)) {
    roomClients.set(room, new Set())
  }
  return roomClients.get(room)!
}

/**
 * Log room statistics
 */
function logRoomStats() {
  const rooms = ['kitchen', 'admin']
  rooms.forEach((room) => {
    const clients = roomClients.get(room)
    console.log(`  Room "${room}": ${clients ? clients.size : 0} connected`)
  })
}

io.on('connection', (socket: Socket) => {
  console.log(`[CONNECT] Client connected: ${socket.id}`)

  // ========================================
  // Event: join-room
  // Join a specific room (e.g., "kitchen", "admin")
  // ========================================
  socket.on('join-room', (data: { room: string }) => {
    const { room } = data

    // Validate room name
    const validRooms = ['kitchen', 'admin', 'customer']
    if (!validRooms.includes(room)) {
      socket.emit('error', {
        message: `Invalid room: "${room}". Valid rooms are: ${validRooms.join(', ')}`,
      })
      console.log(`[JOIN-ROOM] Invalid room "${room}" requested by ${socket.id}`)
      return
    }

    // Join the socket.io room
    socket.join(room)

    // Track the client in our room map
    const clientSet = getRoomClientSet(room)
    clientSet.add(socket.id)

    // Confirm join to the client
    socket.emit('room-joined', {
      room,
      timestamp: new Date().toISOString(),
    })

    // Notify others in the room
    socket.to(room).emit('user-joined-room', {
      socketId: socket.id,
      room,
      timestamp: new Date().toISOString(),
    })

    console.log(`[JOIN-ROOM] Client ${socket.id} joined room "${room}"`)
    logRoomStats()
  })

  // ========================================
  // Event: new-order
  // Broadcast a new order to kitchen and admin rooms
  // ========================================
  socket.on('new-order', (data: Partial<Order>) => {
    orderCounter++

    const order: Order = {
      id: data.id || `ORD-${Date.now()}`,
      orderNumber: data.orderNumber || orderCounter,
      items: data.items || [],
      total: data.total || 0,
      status: data.status || 'pending',
      tableNumber: data.tableNumber,
      customerName: data.customerName,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Broadcast to kitchen room
    io.to('kitchen').emit('new-order', order)

    // Broadcast to admin room
    io.to('admin').emit('new-order', order)

    // Acknowledge back to sender
    socket.emit('order-confirmed', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      timestamp: new Date().toISOString(),
    })

    console.log(
      `[NEW-ORDER] Order #${order.orderNumber} (ID: ${order.id}) - Status: ${order.status} - Items: ${order.items.length} - Total: $${order.total}`
    )
  })

  // ========================================
  // Event: order-updated
  // Broadcast order updates to all connected clients
  // ========================================
  socket.on('order-updated', (data: OrderStatusUpdate) => {
    const update: OrderStatusUpdate = {
      orderId: data.orderId,
      status: data.status,
      updatedAt: new Date().toISOString(),
      updatedBy: data.updatedBy,
    }

    // Broadcast to all connected clients
    io.emit('order-updated', update)

    console.log(
      `[ORDER-UPDATED] Order ${update.orderId} → Status: ${update.status} (by: ${update.updatedBy || 'unknown'})`
    )
  })

  // ========================================
  // Event: order-status-changed
  // Broadcast when kitchen changes order status
  // ========================================
  socket.on('order-status-changed', (data: OrderStatusUpdate) => {
    const update: OrderStatusUpdate = {
      orderId: data.orderId,
      status: data.status,
      updatedAt: new Date().toISOString(),
      updatedBy: data.updatedBy || 'kitchen',
    }

    // Broadcast to all connected clients (kitchen, admin, and customer)
    io.emit('order-status-changed', update)

    console.log(
      `[ORDER-STATUS-CHANGED] Order ${update.orderId} → Status: ${update.status} (changed by: ${update.updatedBy})`
    )
  })

  // ========================================
  // Event: disconnect
  // Clean up room tracking on disconnect
  // ========================================
  socket.on('disconnect', (reason) => {
    console.log(`[DISCONNECT] Client disconnected: ${socket.id} (reason: ${reason})`)

    // Remove client from all rooms
    roomClients.forEach((clients, room) => {
      if (clients.has(socket.id)) {
        clients.delete(socket.id)

        // Notify room that user left
        io.to(room).emit('user-left-room', {
          socketId: socket.id,
          room,
          timestamp: new Date().toISOString(),
        })
      }
    })

    logRoomStats()
  })

  // ========================================
  // Event: error
  // Handle socket errors
  // ========================================
  socket.on('error', (error) => {
    console.error(`[ERROR] Socket error (${socket.id}):`, error)
  })
})

// Start the server on port 3003
const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`🚀 Order Socket Service running on port ${PORT}`)
  console.log(`   Ready for real-time order notifications`)
  console.log(`   Rooms: kitchen, admin, customer`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Received SIGTERM signal, shutting down server...')
  io.disconnectSockets()
  httpServer.close(() => {
    console.log('[SHUTDOWN] Order Socket Service closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Received SIGINT signal, shutting down server...')
  io.disconnectSockets()
  httpServer.close(() => {
    console.log('[SHUTDOWN] Order Socket Service closed')
    process.exit(0)
  })
})
