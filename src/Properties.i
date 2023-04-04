struct Properties
{
	void SetProperty(const char* key,int intval);
	void SetProperty(const char* key,const char* val);
	void SetProperty(const char* key,bool boolval);
};

// SWIG method overloading resolution is a bit slow, adding specialized method
%extend Properties 
{
	void SetIntegerProperty(const char* key,int intval)			{ self->SetProperty(key,intval);	}
	void SetStringProperty(const char* key,const char* val)		{ self->SetProperty(key,val);		}
	void SetBooleanProperty(const char* key,bool boolval)		{ self->SetProperty(key,boolval);	}
};