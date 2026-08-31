async function testConnection() {
  console.log('Testing database connection...')
  console.log('DATABASE_URL =', process.env.DATABASE_URL?.substring(0, 50) + '...')

  const url = process.env.DATABASE_URL || ''
  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    console.error('ERROR: DATABASE_URL must start with postgres:// or postgresql://')
    console.error('Current value:', url)
    process.exit(1)
  }

  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    await prisma.$connect()
    console.log('OK: Database connection successful!')
    await prisma.$disconnect()
  } catch (err: any) {
    console.error('ERROR: Database connection failed!')
    console.error('Message:', err.message)
    if (err.message?.includes('ENOTFOUND')) {
      console.error('\nHost not found. Check your DATABASE_URL hostname.')
    } else if (err.message?.includes('authentication')) {
      console.error('\nAuthentication failed. Check your username and password in DATABASE_URL.')
    } else if (err.message?.includes('ECONNREFUSED')) {
      console.error('\nConnection refused. The database server might be sleeping.')
      console.error('Go to https://console.neon.tech and resume your project.')
    } else if (err.message?.includes('ssl')) {
      console.error('\nSSL error. Make sure your DATABASE_URL has ?sslmode=require at the end.')
    } else if (err.message?.includes('timeout')) {
      console.error('\nConnection timed out. Check your network or try a closer region.')
    }
    process.exit(1)
  }
}

testConnection()
