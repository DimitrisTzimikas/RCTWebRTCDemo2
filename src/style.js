import { StyleSheet } from "react-native";


const s = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  selfView: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 150,
  },
  remoteView: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 150,
  },
  welcome: {
    fontSize: 20,
    textAlign: "center",
    margin: 10,
    borderRadius: 10,
  },
  buttonText: {
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'black',
    width: '50%',
    margin: 10,
    padding: 10,
    borderRadius: 10,
  },
  button: {
    alignItems: 'center',
  },
});

export default s;