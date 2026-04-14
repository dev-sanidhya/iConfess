import { getSession } from "@/lib/auth";
import { getAppSettings } from "@/lib/app-settings";
import ProfilePage from "@/components/ProfilePage";

export default async function Profile() {
  const [user, appSettings] = await Promise.all([getSession(), getAppSettings()]);
  if (!user) return null;

  return (
    <ProfilePage
      appSettings={{
        instagramId: appSettings.instagramId,
        snapchatId: appSettings.snapchatId,
      }}
      user={{
        id: user.id,
        publicCode: user.publicCode,
        name: user.name,
        phone: user.phone,
        gender: user.gender,
        primaryCategory: user.primaryCategory,
        instagramHandle: user.instagramHandle,
        snapchatHandle: user.snapchatHandle,
        pendingSocialOwnershipRequests: user.pendingSocialOwnershipRequests.map((request) => ({
          id: request.id,
          platform: request.platform,
          submittedHandle: request.submittedHandle,
          normalizedHandle: request.normalizedHandle,
        })),
        college: user.college
          ? {
              collegeName: user.college.collegeName,
              pinCode: user.college.pinCode,
              course: user.college.course,
              branch: user.college.branch,
              yearOfPassing: user.college.yearOfPassing,
              section: user.college.section,
              fullName: user.college.fullName,
            }
          : null,
        school: user.school
          ? {
              schoolName: user.school.schoolName,
              pinCode: user.school.pinCode,
              board: user.school.board,
              yearOfCompletion: user.school.yearOfCompletion,
              section: user.school.section,
              fullName: user.school.fullName,
            }
          : null,
        workplace: user.workplace
          ? {
              companyName: user.workplace.companyName,
              department: user.workplace.department,
              city: user.workplace.city,
              fullName: user.workplace.fullName,
            }
          : null,
        gym: user.gym
          ? {
              gymName: user.gym.gymName,
              city: user.gym.city,
              pinCode: user.gym.pinCode,
              timing: user.gym.timing,
              fullName: user.gym.fullName,
            }
          : null,
        neighbourhood: user.neighbourhood
          ? {
              state: user.neighbourhood.state,
              city: user.neighbourhood.city,
              pinCode: user.neighbourhood.pinCode,
              homeNumber: user.neighbourhood.homeNumber,
              premisesName: user.neighbourhood.premisesName,
              fullName: user.neighbourhood.fullName,
            }
          : null,
      }}
    />
  );
}
