import { redirect } from 'next/navigation';
import { auth } from '../../../../auth';
import { connectDB, User } from '@uploadkitdev/db';
import { SettingsForm } from '../../../components/settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  await connectDB();

  const user = await User.findById(session.user.id)
    .select('name email image notifications')
    .lean();

  if (!user) redirect('/login');

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account profile and preferences.
        </p>
      </div>

      <SettingsForm
        initialName={user.name ?? ''}
        email={user.email ?? ''}
        initialNotifications={{
          emailUsageAlerts: user.notifications?.emailUsageAlerts ?? true,
          emailProductUpdates: user.notifications?.emailProductUpdates ?? false,
        }}
      />
    </div>
  );
}
