#include <cmath>
#include <algorithm>
extern "C" void render(const double* ts,int n,int W,int H,float* rgb,double* z,int* owner){
 for(int i=0;i<W*H;i++){z[i]=1e30;owner[i]=-1;for(int k=0;k<3;k++)rgb[i*3+k]=0;}
 for(int pass=0;pass<2;pass++)for(int t=0;t<n;t++){
 const double*q=ts+t*14;double alpha=q[12]/255.;if((alpha>.999)!=(pass==0))continue;
 double x0=q[0],y0=q[1],x1=q[3],y1=q[4],x2=q[6],y2=q[7],den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);if(std::abs(den)<1e-12)continue;
 int lx=std::max(0,(int)std::floor(std::min({x0,x1,x2}))),hx=std::min(W-1,(int)std::ceil(std::max({x0,x1,x2}))),ly=std::max(0,(int)std::floor(std::min({y0,y1,y2}))),hy=std::min(H-1,(int)std::ceil(std::max({y0,y1,y2})));
 for(int y=ly;y<=hy;y++)for(int x=lx;x<=hx;x++){
 double a=((y1-y2)*(x+.5-x2)+(x2-x1)*(y+.5-y2))/den,b=((y2-y0)*(x+.5-x2)+(x0-x2)*(y+.5-y2))/den,c=1-a-b;if(a<0||b<0||c<0)continue;
 double depth=1/(a*q[2]+b*q[5]+c*q[8]);int j=y*W+x;if(depth>z[j]+1e-8)continue;
 if(pass==0){z[j]=depth;owner[j]=(int)q[13];}
 for(int k=0;k<3;k++)rgb[j*3+k]=(float)(alpha*q[9+k]+(1-alpha)*rgb[j*3+k]);
 }
 }
}
