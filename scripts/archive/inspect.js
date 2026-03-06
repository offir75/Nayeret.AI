const {GoogleGenerativeAI}=require('@google/generative-ai');
(async()=>{
  const client=new GoogleGenerativeAI({apiKey:'x'});
  try{
    const modelInfo=await client.getGenerativeModel({model:'gemini-1.5-flash'});
    console.log('modelInfo', modelInfo);
    console.log('model proto', Object.getOwnPropertyNames(Object.getPrototypeOf(modelInfo)));
  }catch(e){console.error(e.message);}
})();
