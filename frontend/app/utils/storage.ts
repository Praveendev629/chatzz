import * as SecureStore from 'expo-secure-store';

const USER_KEY = 'chatzz_user';

export const saveUser = async (user: object) => {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

export const getUser = async () => {
  const val = await SecureStore.getItemAsync(USER_KEY);
  return val ? JSON.parse(val) : null;
};

export const clearUser = async () => {
  await SecureStore.deleteItemAsync(USER_KEY);
};
