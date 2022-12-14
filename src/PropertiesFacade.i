%{
class PropertiesFacade : private Properties
{
public:
	void SetPropertyInt(const char* key,int intval)
	{
		Properties::SetProperty(key,intval);
	}
	void SetPropertyStr(const char* key,const char* val)
	{
		Properties::SetProperty(key,val);
	}
	void SetPropertyBool(const char* key,bool boolval)
	{
		Properties::SetProperty(key,boolval);
	}
};
%}


class PropertiesFacade : private Properties
{
public:
	void SetPropertyInt(const char* key,int intval);
	void SetPropertyStr(const char* key,const char* val);
	void SetPropertyBool(const char* key,bool boolval);
};