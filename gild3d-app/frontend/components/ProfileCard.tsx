import Link from 'next/link';
import Image from 'next/image';

interface Profile {
  userId: string;
  displayName: string;
  age?: number;
  location?: string;
  headline?: string;
  photos?: { url: string; isPrimary: boolean }[];
  user?: { memberType: string; membershipTier: string };
}

export default function ProfileCard({ profile }: { profile: Profile }) {
  const photo = profile.photos?.find(p => p.isPrimary) || profile.photos?.[0];
  const tier = profile.user?.membershipTier || 'FREE';

  return (
    <Link href={`/profile/${profile.userId}`} className="block group">
      <div className="card-dark overflow-hidden hover:border-gold-500 transition-all duration-200 hover:-translate-y-1">
        <div className="relative h-56 bg-dark-700 rounded-lg overflow-hidden mb-4">
          {photo ? (
            <Image src={photo.url} alt={profile.displayName} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-gray-600">👤</div>
          )}
          {tier !== 'FREE' && (
            <span className={`absolute top-2 right-2 ${tier === 'PLATINUM' ? 'badge-gold' : 'badge-silver'}`}>
              {tier}
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-white text-lg">{profile.displayName}</h3>
            {profile.age && <span className="text-gray-400 text-sm">{profile.age}</span>}
          </div>
          {profile.location && <p className="text-gray-400 text-sm mb-1">📍 {profile.location}</p>}
          {profile.headline && <p className="text-gray-300 text-sm line-clamp-2">{profile.headline}</p>}
          <div className="mt-3">
            <span className={`text-xs px-2 py-1 rounded-full ${profile.user?.memberType === 'SUCCESSFUL' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>
              {profile.user?.memberType === 'SUCCESSFUL' ? '💎 Successful' : '✨ Companion'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}