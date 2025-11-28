import { sendEmail } from '@/utils/emailService'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST (request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const creatorRequestId =
      typeof body?.creatorRequestId === 'string'
        ? body.creatorRequestId.trim().toLowerCase()
        : ''

    if (!creatorRequestId) {
      return NextResponse.json(
        { success: false, error: 'Invalid id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: existing, error: fetchError } = await supabase
      .from('creators_join_request')
      .select('id,email,name,isAccepted')
      .eq('id', creatorRequestId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      )
    }

    if (existing.isAccepted) {
      return NextResponse.json(
        { success: false, error: 'Already accepted' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('creators_join_request')
      .update({
        isAccepted: true,
        acceptedAt: new Date()
      })
      .eq('id', creatorRequestId)
      .select('email,name')
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    const { email, name } = data || existing

    await sendEmail(
      email,
      'Welcome to Nigeria Creators — Set Your Password',
      'creators-finish-up-link',
      {
        name,
        setPasswordUrl: `${process.env.FRONTEND_URL}/creators/finish-up?id=${creatorRequestId}`
      },
      'onboarding'
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
