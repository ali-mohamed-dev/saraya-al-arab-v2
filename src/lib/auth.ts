import { NextRequest } from 'next/server'

export function requireRole(request: NextRequest, roles: string[]): boolean {
  const role = request.cookies.get('saraya-staff-role')?.value
  return !!role && roles.includes(role)
}

export function getStaffRole(request: NextRequest): string | null {
  return request.cookies.get('saraya-staff-role')?.value || null
}
