import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'

interface DecodedToken {
  id: string
  nombre: string
  apellido: string
  roles: string[]
  iat: number
  exp: number
}

// Función para verificar si el token es válido
function isTokenValid(token: string): boolean {
  try {
    const decoded = jwtDecode<DecodedToken>(token)
    const currentTime = Date.now() / 1000
    return decoded.exp > currentTime
  } catch (error) {
    return false
  }
}

// Función para obtener los roles del token
function getRolesFromToken(token: string): string[] {
  try {
    const decoded = jwtDecode<DecodedToken>(token)
    return decoded.roles || []
  } catch (error) {
    return []
  }
}

// Función para verificar si el usuario tiene un rol específico
function hasRole(token: string, role: string): boolean {
  const roles = getRolesFromToken(token)
  return roles.includes(role)
}

// Función para limpiar cookies expiradas
function clearExpiredCookies(response: NextResponse) {
  response.cookies.set('auth_token', '', {
    expires: new Date(0),
    path: '/'
  })
  response.cookies.set('user_info', '', {
    expires: new Date(0),
    path: '/'
  })
}

// Rutas que requieren autenticación
const protectedRoutes = [
  '/adminABM',
  '/tourist',
  '/hotel/dashboard',
  '/checkout'
]

// Rutas de autenticación (login, register, etc.)
const authRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password'
]

// Rutas públicas que NO requieren autenticación
const publicRoutes = [
  '/',
  '/home',
  '/search',
  '/hospedaje'
]

// Rutas solo para administradores
const adminOnlyRoutes = [
  '/adminABM'
]

// Rutas solo para turistas
const touristOnlyRoutes = [
  '/tourist'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value
  
  // Verificar si la ruta actual necesita protección
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
  const isAdminRoute = adminOnlyRoutes.some(route => pathname.startsWith(route))
  const isTouristRoute = touristOnlyRoutes.some(route => pathname.startsWith(route))
  const isCheckoutRoute = pathname.startsWith('/checkout')
  
  // Verificar si hay token y si es válido
  const hasValidToken = token && isTokenValid(token)
  
  // Si hay token pero está expirado, limpiar cookies
  if (token && !isTokenValid(token)) {
    console.log('🔴 Token expirado detectado en middleware, limpiando cookies...')
    const response = NextResponse.redirect(new URL('/auth/login/tourist', request.url))
    clearExpiredCookies(response)
    return response
  }

  // 🚨 PROTECCIÓN ESPECÍFICA PARA CHECKOUT
  if (isCheckoutRoute) {
    // Si no hay token válido, redirigir a login
    if (!hasValidToken) {
      const loginUrl = new URL('/auth/login/tourist', request.url)
      // Preservar query params y hash para volver exactamente a la URL original
      const fullPath = `${pathname}${request.nextUrl.search || ''}${request.nextUrl.hash || ''}`
      loginUrl.searchParams.set('callbackUrl', fullPath)
      return NextResponse.redirect(loginUrl)
    }
    
    // Si hay token válido, verificar que sea turista
    const isTourist = hasRole(token, 'TURISTA')
    if (!isTourist) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
    
    return NextResponse.next()
  }
  
  // Si es una ruta protegida (no checkout) y no hay token válido
  if (isProtectedRoute && !hasValidToken) {
    const loginUrl = new URL('/auth/login/tourist', request.url)
    // Preservar query params y hash para volver exactamente a la URL original
    const fullPath = `${pathname}${request.nextUrl.search || ''}${request.nextUrl.hash || ''}`
    loginUrl.searchParams.set('callbackUrl', fullPath)
    return NextResponse.redirect(loginUrl)
  }
  
  // Si hay token válido, verificar roles para otras rutas
  if (hasValidToken) {
    const isTourist = hasRole(token, 'TURISTA')
    const isAdmin = hasRole(token, 'PROPIETARIO') || hasRole(token, 'EMPLEADO') || hasRole(token, 'SUPER-ADMIN')
    
    // Si está en una página de auth y ya está autenticado
    if (isAuthRoute) {
      const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
      if (callbackUrl) {
        return NextResponse.redirect(new URL(callbackUrl, request.url))
      }
    }
    
    // Verificar permisos de rol para rutas específicas
    if (isAdminRoute && isTourist) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    
    if (isTouristRoute && !isTourist) {
      return NextResponse.redirect(new URL('/adminABM', request.url))
    }
  }
  
  // Solo permitir acceso si es realmente una ruta pública o auth
  if (isPublicRoute || isAuthRoute) {
    return NextResponse.next()
  }
  
  // Si llegamos aquí y no es una ruta pública conocida, denegar acceso
  return NextResponse.redirect(new URL('/home', request.url))
}

export const config = {
  matcher: [
    // Proteger rutas específicas
    '/adminABM/:path*',
    '/tourist/:path*',
    '/hotel/dashboard/:path*',
    '/checkout/:path*',
    // Rutas de autenticación
    '/auth/:path*',
    // Rutas principales para verificación básica
    '/',
    '/home',
    '/search',
    '/hospedaje/:path*',
  ]
} 