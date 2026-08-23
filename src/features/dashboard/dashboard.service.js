export function getDashboardStats(){
  return [
    {id:1,label:'Total users',value:1245,note:'+12 today'},
    {id:2,label:'Active users',value:328,note:'+4'},
    {id:3,label:'Tasks completed',value:432,note:'Today: 24'},
    {id:4,label:'Open bugs',value:27,note:'High: 3'},
  ]
}

export function getProjects(){
  return [
    {id:'p1',name:'Thoth Core',description:'Core application engine and data layer',percent:68,color:'#6e61ff'},
    {id:'p2',name:'API Gateway',description:'RESTful and GraphQL API gateway',percent:82,color:'#20d969'},
    {id:'p3',name:'Data Pipeline',description:'ETL pipeline and analytics',percent:45,color:'#ff7818'},
    {id:'p4',name:'Mobile Client',description:'React Native mobile app',percent:31,color:'#a14cff'},
  ]
}

export function getRecentActivity(){
  return [
    {id:1,text:'Fixed typo in README',when:'2h ago'},
    {id:2,text:'Deployed v0.4.1 to staging',when:'7h ago'},
    {id:3,text:'Added Kanban drag-and-drop',when:'1d ago'},
  ]
}

export function getRecentBugs(){
  return [
    {id:1,title:'Login redirect loop',project:'API Gateway',priority:'High',status:'In progress'},
    {id:2,title:'Markdown editor crash',project:'Mobile Client',priority:'Medium',status:'Testing'},
  ]
}
