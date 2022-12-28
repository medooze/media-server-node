
%define SHARED_PTR_BEGIN(T)


%{
using T ## Shared = std::shared_ptr<T>;

static T ## Shared T ## Shared_null_ptr = {};

T ## Shared* T ## Shared_from_proxy(const v8::Local<v8::Value> input)
{
  void *ptr = nullptr;
  v8::Local<v8::Value> target = v8::Local<v8::Proxy>::Cast(input)->GetTarget();
  SWIG_ConvertPtr(target, &ptr, SWIGTYPE_p_## T ## Shared,  0 );
  if (!ptr) return & ## T ## Shared_null_ptr;
  return reinterpret_cast<T ## Shared*>(ptr);
}

%}

%typemap(in) const T ## Shared & {
	$1 = T ## Shared_from_proxy($input);
}

%nodefaultctor T ## Shared;
struct T ## Shared
{
%extend 
%enddef

%define SHARED_PTR_END(T)
T* get();
};
%enddef

%define SHARED_PTR_TO(B)
B ## Shared to##B()
{
	return std::static_pointer_cast<B>(*self);
}
%enddef


%define SHARED_PTR(T)
SHARED_PTR_BEGIN(T)
{
}
SHARED_PTR_END(T)
%enddef

