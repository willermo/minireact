import { z } from "zod";
import { CreateUser, PublicUser } from "../../types/user";

import {
  // cookie names
  refreshTokenCookieName,
  authTokenCookieName,
  csrfTokenCookieName,

  // validation schemas
  emailSchema,
  passwordSchema,
  usernameSchema,
  displayNameSchema,
  nameSchema,

  // headers schemas
  minimalHeadersSchema,
  jsonHeadersSchema,
  protectedHeadersSchema,
  csrfOnlyHeadersSchema,

  // response schemas
  baseResponseSchema,
  successResponseSchema,
  errorResponseSchema,

  // helper types
  MinimalHeaders,
  JsonHeaders,
  ProtectedHeaders,
  CsrfOnlyHeaders,
  SimpleSuccessResponse,
  SuccessResponse,
  ErrorResponse,

  // helper functions
  createSuccessResponse,
} from "../commonSchemas";

/************
 *          *
 *  Get me  *
 *          *
 ************/

/* response schemas */
const getMeDataSchema = z.object({
  user: z.custom<PublicUser>(),
});

const getMeResponseSchema = createSuccessResponse(getMeDataSchema);

/* types */
type GetMeResponse = z.infer<typeof getMeResponseSchema>;

/* exports */
export const getMeSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: getMeResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetMeRequest = {
  Headers: CsrfOnlyHeaders;
  Reply: GetMeResponse | ErrorResponse;
};

/***************
 *             *
 *  Get users  *
 *             *
 ***************/

/* response schemas */
const getUsersDataSchema = z.object({
  users: z.array(z.custom<PublicUser>()),
});

const getUsersResponseSchema = createSuccessResponse(getUsersDataSchema);

/* types */
type GetUsersResponse = z.infer<typeof getUsersResponseSchema>;

/* exports */
export const getUsersSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: getUsersResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetUsersRequest = {
  Headers: CsrfOnlyHeaders;
  Reply: GetUsersResponse | ErrorResponse;
};

/********************
 *                  *
 *  Get user by id  *
 *                  *
 ********************/

/* response schemas */
const getUserByIdDataSchema = z.object({
  user: z.custom<PublicUser>(),
});

const getUserByIdResponseSchema = createSuccessResponse(getUserByIdDataSchema);

/* types */
type GetUserByIdResponse = z.infer<typeof getUserByIdResponseSchema>;

/* exports */
export const getUserByIdSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: getUserByIdResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetUserByIdRequest = {
  Params: { id: number };
  Headers: CsrfOnlyHeaders;
  Reply: GetUserByIdResponse | ErrorResponse;
};

/***********************
 *                     *
 *  Get user by email  *
 *                     *
 ************************/

/* response schemas */
const getUserByEmailDataSchema = z.object({
  user: z.custom<PublicUser>(),
});

const getUserByEmailResponseSchema = createSuccessResponse(
  getUserByEmailDataSchema
);

/* types */
type GetUserByEmailResponse = z.infer<typeof getUserByEmailResponseSchema>;

/* exports */
export const getUserByEmailSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: getUserByEmailResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetUserByEmailRequest = {
  Params: { email: string };
  Headers: CsrfOnlyHeaders;
  Reply: GetUserByEmailResponse | ErrorResponse;
};

/**************************
 *                        *
 *  Get user by username  *
 *                        *
 **************************/

/* response schemas */
const getUserByUsernameDataSchema = z.object({
  user: z.custom<PublicUser>(),
});

const getUserByUsernameResponseSchema = createSuccessResponse(
  getUserByUsernameDataSchema
);

/* types */
type GetUserByUsernameResponse = z.infer<
  typeof getUserByUsernameResponseSchema
>;

/* exports */
export const getUserByUsernameSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: getUserByUsernameResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetUserByUsernameRequest = {
  Params: { username: string };
  Headers: CsrfOnlyHeaders;
  Reply: GetUserByUsernameResponse | ErrorResponse;
};

/******************************
 *                            *
 *  Get user by display name  *
 *                            *
 ******************************/

/* response schemas */
const getUserByDisplayNameDataSchema = z.object({
  user: z.custom<PublicUser>(),
});

const getUserByDisplayNameResponseSchema = createSuccessResponse(
  getUserByDisplayNameDataSchema
);

/* types */
type GetUserByDisplayNameResponse = z.infer<
  typeof getUserByDisplayNameResponseSchema
>;

/* exports */
export const getUserByDisplayNameSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: getUserByDisplayNameResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetUserByDisplayNameRequest = {
  Params: { displayName: string };
  Headers: CsrfOnlyHeaders;
  Reply: GetUserByDisplayNameResponse | ErrorResponse;
};

/*****************
 *               *
 *  Create user  *
 *               *
 *****************/

/* body schemas */
const createUserBodySchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  twoFactorEnabled: z.boolean(),
  gdprConsent: z.boolean(),
}) satisfies z.ZodType<CreateUser>;

/* response schemas */
const createUserDataSchema = z.object({
  user: z.custom<PublicUser>(),
});

const createUserResponseSchema = createSuccessResponse(createUserDataSchema);

/* types */
type CreateUserInput = z.infer<typeof createUserBodySchema>;
type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

/* exports */
export const createUserSchema = {
  body: createUserBodySchema,
  response: {
    200: createUserResponseSchema,
    500: errorResponseSchema,
  },
};

export type CreateUserRequest = {
  Body: CreateUserInput;
  Reply: CreateUserResponse | ErrorResponse;
};

/************************
 *                      *
 *  Delete user by id   *
 *                      *
 ************************/
/* exports */
export const deleteUserByIdSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: successResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type DeleteUserByIdRequest = {
  Params: { id: number };
  Headers: CsrfOnlyHeaders;
  Reply: SimpleSuccessResponse | ErrorResponse;
};

/**************************
 *                        *
 *  Delete user by email  *
 *                        *
 **************************/

/* exports */
export const deleteUserByEmailSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: successResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type DeleteUserByEmailRequest = {
  Params: { email: string };
  Headers: CsrfOnlyHeaders;
  Reply: SimpleSuccessResponse | ErrorResponse;
};

/*********************
 *                   *
 *  Update password  *
 *                   *
 *********************/

/* body schemas */
const updatePasswordBodySchema = z.object({
  currentPassword: z.string(),
  newPassword: passwordSchema,
});

/* response schemas */
const updatePasswordDataSchema = z.object({
  user: z.custom<PublicUser>(),
});

const updatePasswordResponseSchema = createSuccessResponse(
  updatePasswordDataSchema
);

/* types */
type UpdatePasswordInput = z.infer<typeof updatePasswordBodySchema>;
type UpdatePasswordResponse = z.infer<typeof updatePasswordResponseSchema>;

/* exports */
export const updatePasswordSchema = {
  headers: jsonHeadersSchema,
  body: updatePasswordBodySchema,
  response: {
    200: updatePasswordResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type UpdatePasswordRequest = {
  Headers: JsonHeaders;
  Body: UpdatePasswordInput;
  Reply: UpdatePasswordResponse | ErrorResponse;
};

/**********************************
 *                                *
 *  Set password for Google user  *
 *                                *
 **********************************/

/* body schemas */
const setPasswordForGoogleUserBodySchema = z.object({
  password: passwordSchema,
});

/* response schemas */

/* types */
type SetPasswordForGoogleUserInput = z.infer<
  typeof setPasswordForGoogleUserBodySchema
>;

/* exports */
export const setPasswordForGoogleUserSchema = {
  body: setPasswordForGoogleUserBodySchema,
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type SetPasswordForGoogleUserRequest = {
  Headers: JsonHeaders;
  Body: SetPasswordForGoogleUserInput;
  Reply: SimpleSuccessResponse | ErrorResponse;
};

/*************************
 *                       *
 *  Update display name  *
 *                       *
 *************************/

/* body schemas */
const updateDisplayNameBodySchema = z.object({
  displayName: displayNameSchema,
});

/* response schemas */
const updateDisplayNameDataSchema = z.object({
  user: z.custom<PublicUser>(),
});

const updateDisplayNameResponseSchema = createSuccessResponse(
  updateDisplayNameDataSchema
);

/* types */
type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameBodySchema>;
type UpdateDisplayNameResponse = z.infer<
  typeof updateDisplayNameResponseSchema
>;

/* exports */
export const updateDisplayNameSchema = {
  headers: jsonHeadersSchema,
  body: updateDisplayNameBodySchema,
  response: {
    200: updateDisplayNameResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type UpdateDisplayNameRequest = {
  Headers: JsonHeaders;
  Body: UpdateDisplayNameInput;
  Reply: UpdateDisplayNameResponse | ErrorResponse;
};

/****************
 *              *
 *  Get avatar  *
 *              *
 ****************/

/* response schemas */
const getAvatarResponseSchema = z
  .never()
  .describe(
    "Returns a file stream of the avatar image. " +
      "Content-Type will be set based on the file extension."
  );

/* types */
type GetAvatarResponse = z.infer<typeof getAvatarResponseSchema>;

/* exports */
export const getAvatarSchema = {
  params: z.object({
    filename: z
      .string()
      .regex(
        /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp)|default-avatar\.png|deleted-user-avatar\.png)$/i,
        "Invalid filename format. Must be a valid UUID with image extension or 'default-avatar.png' or 'deleted-user-avatar.png'"
      ),
  }),
  response: {
    200: getAvatarResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetAvatarRequest = {
  Headers: MinimalHeaders;
  Params: { filename: string };
  Reply: GetAvatarResponse | ErrorResponse;
};

/***********************
 *                     *
 *  Upload new avatar  *
 *                     *
 ***********************/

/* response schemas */
const uploadNewAvatarDataSchema = z.object({
  filename: z.string(),
  url: z.string(),
});

const uploadNewAvatarResponseSchema = createSuccessResponse(
  uploadNewAvatarDataSchema
);

/* types */
type UploadNewAvatarResponse = z.infer<typeof uploadNewAvatarResponseSchema>;

/* exports */
export const uploadNewAvatarSchema = {
  headers: z.object({
    "content-type": z.string().regex(/^multipart\/form-data/),
    ...minimalHeadersSchema.shape,
  }),
  consumes: ["multipart/form-data"],
  response: {
    200: uploadNewAvatarResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type UploadNewAvatarRequest = {
  Headers: z.infer<typeof uploadNewAvatarSchema.headers>;
  Reply: UploadNewAvatarResponse | ErrorResponse;
};

/*******************
 *                 *
 *  Get user role  *
 *                 *
 *******************/

/* response schemas */
const getUserRoleDataSchema = z.object({
  role: z.string(),
});

const getUserRoleResponseSchema = createSuccessResponse(getUserRoleDataSchema);

/* types */
type GetUserRoleResponse = z.infer<typeof getUserRoleResponseSchema>;

/* exports */
export const getUserRoleSchema = {
  headers: csrfOnlyHeadersSchema,
  params: z.object({
    id: z.string(),
  }),
  response: {
    200: getUserRoleResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetUserRoleRequest = {
  Params: { id: string };
  Headers: CsrfOnlyHeaders;
  Reply: GetUserRoleResponse | ErrorResponse;
};

/*******************
 *                 *
 *  User is admin  *
 *                 *
 *******************/

/* response schemas */
const userIsAdminDataSchema = z.object({
  isAdmin: z.boolean(),
});

const userIsAdminResponseSchema = createSuccessResponse(userIsAdminDataSchema);

/* types */
type UserIsAdminResponse = z.infer<typeof userIsAdminResponseSchema>;

/* exports */
export const userIsAdminSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: userIsAdminResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type UserIsAdminRequest = {
  Headers: CsrfOnlyHeaders;
  Reply: UserIsAdminResponse | ErrorResponse;
};

/**********************
 *                    *
 *  Promote to admin  *
 *                    *
 **********************/

/* exports */
export const promoteToAdminSchema = {
  headers: csrfOnlyHeadersSchema,
  params: z.object({
    id: z.string(),
  }),
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type PromoteToAdminRequest = {
  Headers: CsrfOnlyHeaders;
  Params: { id: string };
  Reply: SimpleSuccessResponse | ErrorResponse;
};

/********************
 *                  *
 *  Demote to user  *
 *                  *
 ********************/

/* exports */
export const demoteToUserSchema = {
  headers: csrfOnlyHeadersSchema,
  params: z.object({
    id: z.string(),
  }),
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type DemoteToUserRequest = {
  Headers: CsrfOnlyHeaders;
  Params: { id: string };
  Reply: SimpleSuccessResponse | ErrorResponse;
};
