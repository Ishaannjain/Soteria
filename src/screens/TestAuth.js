import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { logOut, signIn, signUp } from "../services/authService";

export default function TestAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSignUp = async () => {
    try {
      const user = await signUp(email, password);
      setMessage(`Signed up: ${user.email}`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleSignIn = async () => {
    try {
      const user = await signIn(email, password);
      setMessage(`Signed in: ${user.email}`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleLogOut = async () => {
    try {
      await logOut();
      setMessage("Logged out");
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <Button title="Sign Up" onPress={handleSignUp} />
      <Button title="Sign In" onPress={handleSignIn} />
      <Button title="Log Out" onPress={handleLogOut} />
      <Text style={{ marginTop: 20 }}>{message}</Text>
    </View>
  );
}
