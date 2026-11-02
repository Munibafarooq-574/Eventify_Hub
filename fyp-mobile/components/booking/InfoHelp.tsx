import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';

export default function InfoHelp({ title, message }: { title:string; message:string }) {
  return <TouchableOpacity
    accessibilityRole="button" accessibilityLabel={`About ${title}`}
    onPress={() => Alert.alert(title,message)}
    hitSlop={10}
    style={{width:16,height:18,flexShrink:0,alignItems:'center',justifyContent:'center'}}
  ><Text style={{color:'#7B2869',fontSize:13,lineHeight:16,fontWeight:'600'}}>ⓘ</Text></TouchableOpacity>;
}
