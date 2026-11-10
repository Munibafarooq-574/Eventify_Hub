import { StyleSheet } from 'react-native';

export const packagePreviewStyles = StyleSheet.create({
  previewCard: {
    backgroundColor:'#FFF9FD', borderRadius:22, borderWidth:1, borderColor:'#DFC3D7',
    padding:18, marginBottom:20, shadowColor:'#7B2869', shadowOpacity:0.07,
    shadowOffset:{width:0,height:5}, shadowRadius:12, elevation:2,
  },
  previewTag: {
    alignSelf:'flex-start', backgroundColor:'#F0DCEC', color:'#7B2869',
    paddingHorizontal:10,paddingVertical:5,borderRadius:8,fontSize:10,fontWeight:'800',letterSpacing:1,marginBottom:14,
  },
  previewRow:{flexDirection:'row',alignItems:'flex-start',flexWrap:'wrap',gap:12},
  previewName:{flex:1,minWidth:100,fontSize:17,fontWeight:'800',color:'#3D1233',lineHeight:24},
  previewPrice:{maxWidth:'48%',flexShrink:1,textAlign:'right',lineHeight:20,backgroundColor:'#7B2869',color:'#FFFFFF',fontSize:14,fontWeight:'800',paddingHorizontal:12,paddingVertical:8,borderRadius:12,overflow:'hidden'},
  previewDescription:{fontSize:13,color:'#816C7A',marginTop:12,lineHeight:20},
  previewServices:{fontSize:12.5,color:'#745B6C',marginTop:12,lineHeight:20,padding:12,backgroundColor:'#F5EAF2',borderRadius:12},
  previewDurationSection:{marginTop:16,paddingTop:14,borderTopWidth:1,borderTopColor:'#EBD7E5'},
  previewSectionTitle:{fontSize:13,fontWeight:'800',color:'#7B2869',marginBottom:10},
  previewDurationRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:14,paddingVertical:8},
  previewDurationText:{flex:1,minWidth:0,fontSize:12.5,lineHeight:20,color:'#88717F',fontWeight:'600'},
  previewDurationPrice:{flex:1.2,minWidth:0,fontSize:12.5,lineHeight:20,color:'#632052',fontWeight:'700',textAlign:'right',flexShrink:1},
});
