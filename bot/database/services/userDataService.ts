import { UserSchema } from '../models/user/UserModel';

export async function getUserData(userId: string): Promise<UserSchema> {
    return {
        id: userId,
        username: 'Unknown',
        sharedServers: 0
    };
}
