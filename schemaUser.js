import Joi from "joi";

const schemaUser = Joi.object({
    name: Joi.string().min(5).required(),
    email: Joi.string().email().min(1).max(50), 
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')),
    confirmPassword: Joi.ref('password'),
    isTeacher: Joi.valid(true, false).required(),
    school: Joi.string()
  });

export default schemaUser;