import Joi from "joi";

const schemaUser = Joi.object({
    name: Joi.string().uppercase().min(5).required(),
    email: Joi.string().uppercase().email().min(1).max(50), 
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')),
    confirmPassword: Joi.ref('password'),
    isTeacher: Joi.valid(true, false).required()
  });

export default schemaUser;