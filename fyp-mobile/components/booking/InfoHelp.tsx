import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';

export default function InfoHelp({ title, message }: { title:string; message:string }) {
  return <TouchableOpacity
    accessibilityRole="button" accessibilityLabel={`About ${title}`}
    onPress={() => Alert.alert(title,message)}
    style={{minWidth:36,minHeight:36,alignItems:'center',justifyContent:'center'}}
  ><Text style={{color:'#7B2869',fontSize:21,fontWeight:'600'}}>ⓘ</Text></TouchableOpacity>;
}
