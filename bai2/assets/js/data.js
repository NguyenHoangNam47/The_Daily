const NEWS_MENU = {
  menu:[
    {id:'home',title:'Trang chủ',url:'index.html',type:'home'},
    {id:'latest',title:'Mới nhất',url:'index.html?category=latest',type:'category'},
    {id:'the-gioi',title:'Thế giới',url:'index.html?category=the-gioi',type:'category',children:[
      {id:'quan-su',title:'Quân sự',url:'index.html?category=quan-su'},
      {id:'phan-tich',title:'Phân tích - Bình luận',url:'index.html?category=phan-tich'},
      {id:'the-gioi-do-day',title:'Thế giới đó đây',url:'index.html?category=the-gioi-do-day'},
      {id:'kieu-bao',title:'Kiều bào',url:'index.html?category=kieu-bao'}]},
    {id:'thoi-su',title:'Thời sự',url:'index.html?category=thoi-su',type:'category',children:[
      {id:'chinh-tri',title:'Chính trị',url:'index.html?category=chinh-tri'},
      {id:'giao-thong',title:'Giao thông',url:'index.html?category=giao-thong'},
      {id:'moi-truong',title:'Môi trường',url:'index.html?category=moi-truong'},
      {id:'nong-tren-mang',title:'Nóng trên mạng',url:'index.html?category=nong-tren-mang'}]}
  ]
};

const CAT_TITLES={latest:'Mới nhất','the-gioi':'Thế giới','thoi-su':'Thời sự','quan-su':'Quân sự','phan-tich':'Phân tích - Bình luận','the-gioi-do-day':'Thế giới đó đây','kieu-bao':'Kiều bào','chinh-tri':'Chính trị','giao-thong':'Giao thông','moi-truong':'Môi trường','nong-tren-mang':'Nóng trên mạng'};
