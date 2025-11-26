'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';

export default function FreelancersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['freelancers'],
    queryFn: async () => {
      const res = await usersApi.listUsers({ role: 'freelancer', limit: 20 });
      return res.data;
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Find Freelancers</h1>
        <p className="text-gray-600 mb-8">
          Connect with talented freelancers around the world
        </p>

        {isLoading && (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading freelancers...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load freelancers
          </div>
        )}

        {data?.users && data.users.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.users.map((user: any) => (
              <div key={user.wallet_address} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                    {user.profile_data?.name?.[0] || user.wallet_address[0]}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-bold">
                      {user.profile_data?.name || 'Anonymous'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {user.is_verified ? '✓ Verified' : 'Unverified'}
                    </p>
                  </div>
                </div>
                
                {user.profile_data?.bio && (
                  <p className="text-gray-600 text-sm mb-4">{user.profile_data.bio}</p>
                )}
                
                {user.profile_data?.skills && user.profile_data.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {user.profile_data.skills.slice(0, 3).map((skill: string) => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    ⭐ {user.reputation_score || 0}
                  </span>
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isLoading && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-2xl font-bold mb-2">No Freelancers Yet</h2>
              <p className="text-gray-600">
                Be the first to join our platform!
              </p>
            </div>
          )
        )}
      </div>
    </main>
  );
}
