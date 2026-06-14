const bcrypt = require('bcryptjs')
const hashes = [
  { user: 'cashier1', hash: '$2b$12$Un7SWndp7M0pJHvQ32VUiuZ5FPnW3T/JPOWlxLjHDD99WcBw0xw8y' },
  { user: 'admin', hash: '$2b$12$BoJvnqL//Gy5w31502Mj8.nbkLxArI8UBivtR.oP9BRqq6yZwBOqS' },
]
for (const { user, hash } of hashes) {
  console.log(`${user} vs admin123:`, bcrypt.compareSync('admin123', hash))
}
