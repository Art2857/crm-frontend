import { NextResponse } from 'next/server';

/**
 * Health check endpoint для Docker healthcheck
 * GET /api/health
 */
export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
      environment: process.env.NODE_ENV || 'development'
    }, { status: 200 });
  } catch (error) {
    // Не шумим в логах: этот эндпойнт используется инфраструктурой
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 500 });
  }
}
