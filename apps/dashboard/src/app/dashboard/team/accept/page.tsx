import { redirect } from 'next/navigation';
import { auth } from '../../../../../auth';
import { AcceptInviteButton } from '../../../../components/accept-invite-button';

export const dynamic = 'force-dynamic';

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    // Come back here after signing in; the token stays in the callback URL.
    redirect(`/login?callbackUrl=${encodeURIComponent(`/dashboard/team/accept?token=${token ?? ''}`)}`);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-16">
      <h1 className="text-xl font-semibold text-foreground">Team invitation</h1>
      {token ? (
        <>
          <p className="text-sm text-muted-foreground">
            You are signed in as <span className="text-foreground">{session.user.email}</span>. The
            invitation only works for the email address it was sent to.
          </p>
          <AcceptInviteButton token={token} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">This invitation link is missing its token.</p>
      )}
    </div>
  );
}
