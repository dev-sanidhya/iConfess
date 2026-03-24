import { getSession } from "@/lib/auth";
import ProfilePage from "@/components/ProfilePage";

export default async function Profile() {
  const user = await getSession();
  if (!user) return null;

  return (
    <ProfilePage
      user={{
        id: user.id,
        name: user.name,
        phone: user.phone,
        college: user.college
          ? {
              collegeName: user.college.collegeName,
              course: user.college.course,
              branch: user.college.branch,
              yearOfPassing: user.college.yearOfPassing,
              section: user.college.section,
            }
          : null,
        workplace: user.workplace
          ? { companyName: user.workplace.companyName, department: user.workplace.department, city: user.workplace.city }
          : null,
        gym: user.gym ? { gymName: user.gym.gymName, city: user.gym.city } : null,
        neighbourhood: user.neighbourhood
          ? { premisesName: user.neighbourhood.premisesName, city: user.neighbourhood.city }
          : null,
      }}
    />
  );
}
